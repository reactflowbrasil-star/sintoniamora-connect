-- Reparo consolidado do backend ausente.
--
-- Verificado no projeto implantado (jquujdxypjylvghyuqco) em 2026-10-04:
--   tabelas  live_viewer_presence, live_moderation_actions  -> existem
--   RPCs    mark_live_presence, live_live_metrics, live_mute_user,
--           live_remove_user, live_block_user, register_profile_media,
--           touch_presence, online_members, online_count,
--           complete_member_registration, live_active_sessions -> TODAS 404 PGRST202
--
-- As tabelas de 20261003000000_live_experience.sql foram criadas, mas a
-- execução parou antes das funções. O efeito prático no app:
--
--   * foto, capa e vídeo: o arquivo sobe para o storage, o registro em
--     profile_media falha com 404 e o chamador apaga o arquivo — nada é salvo
--     e a pessoa só vê o erro do navegador;
--   * live: sem mark_live_presence não há heartbeat do host, e sem
--     live_active_sessions a listagem mostra sessões LIVE abandonadas como
--     "Transmitindo agora";
--   * presença e selo AO VIVO: as funções não existem.
--
-- Tudo aqui é `create or replace` / `drop trigger if exists`, então pode ser
-- executado quantas vezes for preciso, inclusive depois de uma tentativa
-- parcial. Não altera nenhuma tabela nem política existente.

-- ---------------------------------------------------------------- 1. live ---

create or replace function private.is_moderator_of_live(p_session_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path='' as $$
  select p_user_id = (select ls.host_id from public.live_sessions ls where ls.id = p_session_id limit 1)
     or exists (
       select 1 from public.live_moderation_actions m
        where m.session_id = p_session_id
          and m.moderator_id = p_user_id
          and m.action = 'add_moderator'
          and m.created_at > now() - interval '24 hours'
     )
$$;
revoke all on function private.is_moderator_of_live(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_moderator_of_live(uuid, uuid) to authenticated;

create or replace function private.guard_live_chat_moderation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists (
    select 1 from public.live_moderation_actions m
     where m.session_id = new.session_id
       and m.target_user_id = new.sender_id
       and m.action = 'mute_chat'
       and m.created_at > now() - interval '12 hours'
  ) then
    raise exception 'Você está silenciado nesta transmissão.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_live_chat_moderation() from public, anon, authenticated;
drop trigger if exists guard_live_chat_moderation on public.live_chat_messages;
create trigger guard_live_chat_moderation before insert on public.live_chat_messages
  for each row execute function private.guard_live_chat_moderation();

create or replace function private.guard_live_presence_moderation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists (
    select 1 from public.live_moderation_actions m
     where m.session_id = new.session_id
       and m.target_user_id = new.user_id
       and m.action in ('remove_from_live', 'block_from_live')
       and m.created_at > now() - interval '12 hours'
  ) then
    raise exception 'Você foi removido desta transmissão.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_live_presence_moderation() from public, anon, authenticated;
drop trigger if exists guard_live_presence_moderation on public.live_viewer_presence;
create trigger guard_live_presence_moderation before insert on public.live_viewer_presence
  for each row execute function private.guard_live_presence_moderation();

-- Heartbeat: marca presença e responde false se a sessão não estiver LIVE.
create or replace function public.mark_live_presence(p_session_id uuid)
returns boolean
language plpgsql security invoker set search_path='' as $$
declare
  live_status text;
begin
  select status into live_status from public.live_sessions where id = p_session_id limit 1;
  if live_status is null or live_status <> 'LIVE' then
    return false;
  end if;

  insert into public.live_viewer_presence(session_id, user_id, seen_at)
    values (p_session_id, (select auth.uid()), now())
    on conflict (session_id, user_id) do update set seen_at = now();

  return true;
end;
$$;
revoke all on function public.mark_live_presence(uuid) from public, anon;
grant execute on function public.mark_live_presence(uuid) to authenticated;

-- Agregados contados pelo servidor. peak_viewers não é informado de propósito:
-- não há histórico de espectadores guardado.
create or replace function public.live_live_metrics(p_session_id uuid)
returns table (
  current_viewers bigint,
  unique_viewers bigint,
  likes bigint,
  messages bigint,
  gifts bigint,
  points bigint
)
language sql stable security definer set search_path='' as $$
  select
    (select count(*)::bigint from public.live_viewer_presence vp
      where vp.session_id = p_session_id
        and vp.seen_at > now() - interval '60 seconds'),
    (select count(distinct vp.user_id)::bigint from public.live_viewer_presence vp
      where vp.session_id = p_session_id),
    (select count(*)::bigint from public.live_interactions i
      where i.session_id = p_session_id and i.kind = 'TAP'),
    (select count(*)::bigint from public.live_chat_messages m
      where m.session_id = p_session_id),
    (select coalesce(sum(i.quantity), 0)::bigint from public.live_interactions i
      where i.session_id = p_session_id and i.kind = 'GIFT' and i.gift_id is not null),
    (select coalesce(b.total_points, 0)::bigint from public.live_reward_balances b
      where b.user_id = (select ls.host_id from public.live_sessions ls where ls.id = p_session_id limit 1));
$$;
revoke all on function public.live_live_metrics(uuid) from public, anon;
grant execute on function public.live_live_metrics(uuid) to authenticated;

create or replace function public.live_mute_user(p_session_id uuid, p_target_user_id uuid, p_reason text default '')
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  acting_user uuid := (select auth.uid());
  host_id uuid;
begin
  if acting_user is null then raise exception 'Não autenticado.'; end if;
  select host_id into host_id from public.live_sessions
   where id = p_session_id and status = 'LIVE' limit 1;
  if host_id is null then raise exception 'Transmissão não encontrada ou já encerrada.'; end if;
  if host_id <> acting_user and not private.is_moderator_of_live(p_session_id, acting_user) then
    raise exception 'Somente o transmissor ou moderadores podem silenciar usuários.';
  end if;
  if p_target_user_id = acting_user then raise exception 'Não é possível aplicar essa ação em você.'; end if;
  insert into public.live_moderation_actions(session_id, moderator_id, target_user_id, action, reason)
    values (p_session_id, acting_user, p_target_user_id, 'mute_chat', nullif(p_reason, ''));
  return gen_random_uuid();
end;
$$;
revoke all on function public.live_mute_user(uuid, uuid, text) from public, anon;
grant execute on function public.live_mute_user(uuid, uuid, text) to authenticated;

create or replace function public.live_remove_user(p_session_id uuid, p_target_user_id uuid, p_reason text default '')
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  acting_user uuid := (select auth.uid());
  host_id uuid;
begin
  if acting_user is null then raise exception 'Não autenticado.'; end if;
  select host_id into host_id from public.live_sessions
   where id = p_session_id and status = 'LIVE' limit 1;
  if host_id is null then raise exception 'Transmissão não encontrada ou já encerrada.'; end if;
  if host_id <> acting_user and not private.is_moderator_of_live(p_session_id, acting_user) then
    raise exception 'Somente o transmissor ou moderadores podem remover espectadores.';
  end if;
  if p_target_user_id = acting_user then raise exception 'Não é possível remover você mesmo desta live.'; end if;
  insert into public.live_moderation_actions(session_id, moderator_id, target_user_id, action, reason)
    values (p_session_id, acting_user, p_target_user_id, 'remove_from_live', nullif(p_reason, ''));
  return gen_random_uuid();
end;
$$;
revoke all on function public.live_remove_user(uuid, uuid, text) from public, anon;
grant execute on function public.live_remove_user(uuid, uuid, text) to authenticated;

create or replace function public.live_block_user(p_session_id uuid, p_target_user_id uuid, p_reason text default '')
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  acting_user uuid := (select auth.uid());
  host_id uuid;
begin
  if acting_user is null then raise exception 'Não autenticado.'; end if;
  select host_id into host_id from public.live_sessions
   where id = p_session_id and status = 'LIVE' limit 1;
  if host_id is null then raise exception 'Transmissão não encontrada ou já encerrada.'; end if;
  if host_id <> acting_user and not private.is_moderator_of_live(p_session_id, acting_user) then
    raise exception 'Somente o transmissor ou moderadores podem bloquear na live.';
  end if;
  if p_target_user_id = acting_user then raise exception 'Não é possível bloquear você mesmo.'; end if;
  insert into public.blocks(blocker_id, blocked_id)
    values (acting_user, p_target_user_id) on conflict do nothing;
  insert into public.live_moderation_actions(session_id, moderator_id, target_user_id, action, reason)
    values (p_session_id, acting_user, p_target_user_id, 'block_from_live', nullif(p_reason, ''));
  return gen_random_uuid();
end;
$$;
revoke all on function public.live_block_user(uuid, uuid, text) from public, anon;
grant execute on function public.live_block_user(uuid, uuid, text) to authenticated;

-- Só é "ao vivo" se o host tiver enviado presença nos últimos 90 segundos.
create or replace function public.live_active_sessions()
returns table (
  id uuid,
  host_id uuid,
  room_id bigint,
  title text,
  status text,
  created_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select ls.id, ls.host_id, ls.room_id, ls.title, ls.status, ls.created_at
    from public.live_sessions ls
   where ls.status = 'LIVE'
     and exists (
       select 1 from public.live_viewer_presence vp
        where vp.session_id = ls.id
          and vp.user_id = ls.host_id
          and vp.seen_at > now() - interval '90 seconds'
     )
     and not private.are_blocked(ls.host_id, (select auth.uid()));
$$;
revoke all on function public.live_active_sessions() from public, anon;
grant execute on function public.live_active_sessions() to authenticated;

-- -------------------------------------------------------------- 2. mídia ---

create or replace function public.register_profile_media(
  p_object_path text,
  p_media_type text,
  p_mime_type text,
  p_size_bytes bigint
) returns public.profile_media
language plpgsql security invoker set search_path=public,storage as $$
declare result public.profile_media;
begin
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'profile-media' and name = p_object_path
  ) then
    raise exception 'Upload não encontrado.';
  end if;
  insert into public.profile_media(user_id,object_path,media_type,mime_type,size_bytes)
    values(auth.uid(), p_object_path, p_media_type, p_mime_type, p_size_bytes)
    returning * into result;
  return result;
end;
$$;
revoke all on function public.register_profile_media(text,text,text,bigint) from public, anon;
grant execute on function public.register_profile_media(text,text,text,bigint) to authenticated;

-- ---------------------------------------------------------- 3. presença ---

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  live_session_id uuid null
);

alter table public.user_presence enable row level security;

drop policy if exists "presence is readable by everyone" on public.user_presence;
create policy "presence is readable by everyone"
  on public.user_presence for select to authenticated using (true);
drop policy if exists "members write own presence" on public.user_presence;
create policy "members write own presence"
  on public.user_presence for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "members update own presence" on public.user_presence;
create policy "members update own presence"
  on public.user_presence for update to authenticated using (user_id = auth.uid());
drop policy if exists "members delete own presence" on public.user_presence;
create policy "members delete own presence"
  on public.user_presence for delete to authenticated using (user_id = auth.uid());

create index if not exists user_presence_seen_idx on public.user_presence(last_seen_at desc);

create or replace function public.touch_presence(p_live_session_id uuid default null)
returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar.'; end if;
  insert into public.user_presence(user_id, last_seen_at, live_session_id)
    values (auth.uid(), now(), p_live_session_id)
    on conflict (user_id) do update
      set last_seen_at = now(), live_session_id = excluded.live_session_id;
end;
$$;
revoke all on function public.touch_presence(uuid) from public, anon;
grant execute on function public.touch_presence(uuid) to authenticated;

create or replace function public.online_members(p_limit int default 24)
returns table (
  user_id uuid,
  display_name text,
  avatar_path text,
  live_session_id uuid,
  last_seen_at timestamptz
)
language sql security definer set search_path=public as $$
  select p.user_id,
         coalesce(nullif(profiles.display_name, ''), 'Membro'),
         profiles.avatar_path,
         p.live_session_id,
         p.last_seen_at
    from public.user_presence p
    join public.profiles on profiles.id = p.user_id
   where p.last_seen_at > now() - interval '90 seconds'
   order by p.live_session_id is null, p.last_seen_at desc
   limit greatest(1, least(coalesce(p_limit, 24), 100));
$$;
revoke all on function public.online_members(int) from public, anon;
grant execute on function public.online_members(int) to authenticated;

create or replace function public.online_count()
returns table (total bigint)
language sql security definer set search_path=public as $$
  select count(*) from public.user_presence
   where last_seen_at > now() - interval '90 seconds';
$$;
revoke all on function public.online_count() from public, anon;
grant execute on function public.online_count() to authenticated;

-- --------------------------------------------------- 4. cadastro social ---

-- O gatilho original exigia birth_date/terms_accepted em raw_user_meta_data,
-- campos que o Google nunca envia: sem esta versão, o after insert de
-- auth.users rejeita qualquer cadastro social.
create or replace function public.create_sintoniamora_member() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  bd date;
  has_birth boolean := coalesce(new.raw_user_meta_data->>'birth_date','') <> '';
begin
  if has_birth then
    if coalesce(new.raw_user_meta_data->>'terms_accepted','false') <> 'true' then
      raise exception 'É necessário aceitar os termos.';
    end if;
    begin
      bd := (new.raw_user_meta_data->>'birth_date')::date;
    exception when others then
      raise exception 'Data de nascimento inválida.';
    end;
    if bd > (current_date - interval '18 years')::date then
      raise exception 'A plataforma é exclusiva para maiores de 18 anos.';
    end if;
  end if;

  insert into public.profiles(id,display_name)
    values(new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name',''))
    on conflict (id) do update set display_name = excluded.display_name;

  if has_birth then
    insert into public.private_profiles(user_id,full_name,birth_date)
      values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), bd)
      on conflict (user_id) do update
        set full_name = excluded.full_name, birth_date = excluded.birth_date;
    insert into public.terms_acceptances(user_id,terms_version)
      select new.id, '2026-10-01'
      where not exists (select 1 from public.terms_acceptances ta where ta.user_id = new.id);
  end if;
  return new;
end;
$$;

create or replace function public.complete_member_registration(
  birth_date date,
  full_name text,
  display_name text
) returns void
language plpgsql security definer set search_path=public as $$
declare
  member uuid := auth.uid();
begin
  if member is null then
    raise exception 'Entre na sua conta para continuar.';
  end if;
  if birth_date is null then
    raise exception 'Informe uma data de nascimento válida.';
  end if;
  if birth_date > (current_date - interval '18 years')::date then
    raise exception 'A plataforma é exclusiva para maiores de 18 anos.';
  end if;
  if coalesce(btrim(full_name),'') = '' then
    raise exception 'Informe seu nome completo.';
  end if;

  insert into public.profiles(id,display_name)
    values(member, left(coalesce(nullif(btrim(display_name),''), btrim(full_name)), 40))
    on conflict (id) do update
      set display_name = coalesce(nullif(btrim(display_name),''), public.profiles.display_name);

  insert into public.private_profiles(user_id,full_name,birth_date)
    values(member, btrim(full_name), birth_date)
    on conflict (user_id) do update
      set full_name = excluded.full_name, birth_date = excluded.birth_date;

  insert into public.terms_acceptances(user_id,terms_version)
    select member, '2026-10-01'
    where not exists (select 1 from public.terms_acceptances ta where ta.user_id = member);
end;
$$;

revoke all on function public.complete_member_registration(date, text, text) from public, anon;
grant execute on function public.complete_member_registration(date, text, text) to authenticated;