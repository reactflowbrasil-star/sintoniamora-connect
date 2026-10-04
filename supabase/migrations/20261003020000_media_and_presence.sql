-- Restaura public.register_profile_media.
--
-- A tabela public.profile_media existe no projeto implantado, mas a função não:
-- PostgREST responde 404/PGRST202 ao chamá-la. Sem ela, todo upload de foto ou
-- vídeo faz o caminho completo — o arquivo sobe para o storage, o registro falha
-- e o chamador apaga o arquivo no catch — e a pessoa vê um erro sem ter nada
-- gravado. É a causa do "upload não funciona".
--
-- A definição é a mesma da migração inicial, reemitida de forma idempotente.

create or replace function public.register_profile_media(
  p_object_path text,
  p_media_type text,
  p_mime_type text,
  p_size_bytes bigint
) returns public.profile_media
language plpgsql security invoker set search_path=public,storage as $$
declare result public.profile_media;
begin
  if not exists(
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

grant execute on function public.register_profile_media(text,text,text,bigint) to authenticated;

-- Tabela de presença real, para o selo de "ao vivo" e o contador de online.
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  live_session_id uuid null
);

alter table public.user_presence enable row level security;

create policy "presence is readable by everyone"
  on public.user_presence for select to authenticated using (true);

create policy "members write own presence"
  on public.user_presence for insert to authenticated with check (user_id = auth.uid());
create policy "members update own presence"
  on public.user_presence for update to authenticated using (user_id = auth.uid());
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

grant execute on function public.touch_presence(uuid) to authenticated;

-- Quem está online agora: visto nos últimos 90 segundos, para não depender de
-- um cron de limpeza.
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

grant execute on function public.online_members(int) to authenticated;

-- Contagem compacta para o indicador da landing. Mesmo corte de 90 segundos.
create or replace function public.online_count()
returns table (total bigint)
language sql security definer set search_path=public as $$
  select count(*) from public.user_presence
  where last_seen_at > now() - interval '90 seconds';
$$;

grant execute on function public.online_count() to authenticated;