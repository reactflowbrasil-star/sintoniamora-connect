-- Mídia binária vive no servidor privado do site. O banco mantém metadados,
-- quotas e RLS como fonte de autorização para galerias e publicações.

alter table public.profiles add column if not exists gender text not null default '' check(char_length(gender)<=40);
alter table public.profiles add column if not exists ethnicity text not null default '' check(char_length(ethnicity)<=60);
alter table public.profiles add column if not exists fetishes text[] not null default '{}' check(cardinality(fetishes)<=30);
alter table public.profiles add column if not exists location_latitude double precision;
alter table public.profiles add column if not exists location_longitude double precision;
alter table public.profiles add column if not exists share_location boolean not null default false;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='profiles_latitude_valid') then
    alter table public.profiles add constraint profiles_latitude_valid check(location_latitude is null or location_latitude between -90 and 90);
  end if;
  if not exists(select 1 from pg_constraint where conname='profiles_longitude_valid') then
    alter table public.profiles add constraint profiles_longitude_valid check(location_longitude is null or location_longitude between -180 and 180);
  end if;
end $$;

create or replace function public.guard_shared_location_precision()
returns trigger language plpgsql set search_path=public as $$
begin
  if not new.share_location then
    new.location_latitude := null;
    new.location_longitude := null;
  else
    if new.location_latitude is not null then new.location_latitude := round(new.location_latitude::numeric, 2)::double precision; end if;
    if new.location_longitude is not null then new.location_longitude := round(new.location_longitude::numeric, 2)::double precision; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_shared_location_precision() from public, anon, authenticated;
drop trigger if exists guard_shared_location_precision on public.profiles;
create trigger guard_shared_location_precision before insert or update
on public.profiles for each row execute function public.guard_shared_location_precision();

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

grant delete on public.notifications to authenticated;
drop policy if exists "members delete own notifications" on public.notifications;
create policy "members delete own notifications" on public.notifications for delete to authenticated
using(recipient_id=(select auth.uid()));
grant delete on public.messages to authenticated;
drop policy if exists "members delete own messages" on public.messages;
create policy "members delete own messages" on public.messages for delete to authenticated
using(sender_id=(select auth.uid()) and private.can_access_conversation(conversation_id,(select auth.uid())));
drop policy if exists "members add own media metadata" on public.profile_media;
create policy "members add own media metadata" on public.profile_media
for insert to authenticated with check (
  user_id = (select auth.uid())
  and split_part(object_path, '/', 1) = (select auth.uid())::text
  and size_bytes <= case when media_type = 'photo' then 15728640 else 104857600 end
  and ((media_type = 'photo' and mime_type in ('image/jpeg','image/png','image/webp'))
    or (media_type = 'video' and mime_type in ('video/mp4','video/webm')))
);

drop policy if exists "members read profile gallery media" on public.profile_media;
create policy "members read profile gallery media" on public.profile_media for select to authenticated
using(private.user_is_active((select auth.uid())) and (user_id=(select auth.uid()) or not private.are_blocked(user_id,(select auth.uid()))));

create or replace function public.register_profile_media(
  p_object_path text,
  p_media_type text,
  p_mime_type text,
  p_size_bytes bigint
) returns public.profile_media
language plpgsql security invoker set search_path=public,storage as $$
declare result public.profile_media;
begin
  if auth.uid() is null or split_part(p_object_path, '/', 1) <> auth.uid()::text then
    raise exception 'Acesso negado.';
  end if;
  insert into public.profile_media(user_id,object_path,media_type,mime_type,size_bytes)
  values(auth.uid(),p_object_path,p_media_type,p_mime_type,p_size_bytes)
  returning * into result;
  return result;
end;
$$;
revoke all on function public.register_profile_media(text,text,text,bigint) from public, anon;
grant execute on function public.register_profile_media(text,text,text,bigint) to authenticated;

create or replace function public.guard_server_hosted_profile_media()
returns trigger language plpgsql security invoker set search_path=public as $$
declare
  member_id uuid;
  feature text;
  plan_key text;
  media_limit integer;
  media_count integer;
begin
  member_id := new.user_id;
  if member_id is null or not private.user_is_active(member_id) or (select auth.uid()) is distinct from member_id
    or split_part(new.object_path, '/', 1) <> member_id::text then
    raise exception 'Acesso negado.';
  end if;
  if new.media_type = 'photo' then
    if new.mime_type not in ('image/jpeg','image/png','image/webp') or new.size_bytes > 15728640 then
      raise exception 'Formato ou tamanho de foto não permitido.';
    end if;
    feature := 'max_profile_photos';
  elsif new.media_type = 'video' then
    if new.mime_type not in ('video/mp4','video/webm') or new.size_bytes > 104857600 then
      raise exception 'Formato ou tamanho de vídeo não permitido.';
    end if;
    feature := 'max_profile_videos';
  else
    raise exception 'Formato de mídia não permitido.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(member_id::text, 0));
  if exists(select 1 from public.subscriptions where user_id=member_id and status='ACTIVE' and plan_id='premium') then
    plan_key := 'premium';
  else
    plan_key := 'free';
  end if;
  select feature_value into media_limit from public.plan_features where plan_id=plan_key and feature_key=feature;
  if media_limit is null then media_limit := case when feature='max_profile_photos' then 5 else 2 end; end if;
  select count(*) into media_count from public.profile_media
    where user_id=member_id and media_type=new.media_type and id is distinct from new.id;
  -- Metadados antigos continuam contando até serem apagados ou migrados.
  if media_count >= media_limit then raise exception 'Você atingiu o limite de mídia do seu plano.'; end if;
  return new;
end;
$$;
revoke all on function public.guard_server_hosted_profile_media() from public, anon, authenticated;
drop trigger if exists guard_server_hosted_profile_media on public.profile_media;
create trigger guard_server_hosted_profile_media before insert or update on public.profile_media
for each row execute function public.guard_server_hosted_profile_media();

create or replace function public.guard_server_hosted_post_media()
returns trigger language plpgsql set search_path=public as $$
declare media_count integer;
begin
  if new.owner_id is distinct from (select auth.uid()) or not private.user_is_active(new.owner_id) then raise exception 'Acesso negado.'; end if;
  if tg_op = 'UPDATE' and (new.post_id is distinct from old.post_id or new.owner_id is distinct from old.owner_id
    or new.object_path is distinct from old.object_path or new.media_type is distinct from old.media_type
    or new.mime_type is distinct from old.mime_type or new.size_bytes is distinct from old.size_bytes) then
    raise exception 'Metadados de mídia não podem ser alterados.';
  end if;
  if new.media_type='photo' then
    if new.mime_type not in ('image/jpeg','image/png','image/webp','image/gif') or new.size_bytes > 10485760 then
      raise exception 'Formato ou tamanho de foto não permitido.';
    end if;
  elsif new.media_type='video' then
    if new.mime_type not in ('video/mp4','video/webm','video/quicktime') or new.size_bytes > 52428800 then
      raise exception 'Formato ou tamanho de vídeo não permitido.';
    end if;
  else
    raise exception 'Formato de mídia não permitido.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.post_id::text, 0));
  select count(*) into media_count from public.post_media where post_id=new.post_id and id is distinct from new.id;
  if media_count >= 4 then raise exception 'Escolha até 4 mídias por publicação.'; end if;
  return new;
end;
$$;
revoke all on function public.guard_server_hosted_post_media() from public, anon;
drop trigger if exists guard_server_hosted_post_media on public.post_media;
create trigger guard_server_hosted_post_media before insert or update on public.post_media
for each row execute function public.guard_server_hosted_post_media();

create table if not exists public.message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid unique references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  media_type text not null check(media_type in ('photo','audio')),
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0),
  created_at timestamptz not null default now()
);
alter table public.message_media enable row level security;
grant select, insert, delete on public.message_media to authenticated;
drop policy if exists "conversation members read message media" on public.message_media;
create policy "conversation members read message media" on public.message_media
for select to authenticated using(private.can_access_conversation(conversation_id,(select auth.uid()))
  and private.user_is_active((select auth.uid())));
drop policy if exists "members attach media to own conversations" on public.message_media;
create policy "members attach media to own conversations" on public.message_media
for insert to authenticated with check(owner_id=(select auth.uid())
  and private.can_access_conversation(conversation_id,(select auth.uid()))
  and private.user_is_active((select auth.uid()))
  and message_id is not null
  and exists(select 1 from public.messages m where m.id=public.message_media.message_id and m.conversation_id=public.message_media.conversation_id and m.sender_id=(select auth.uid()))
  and split_part(object_path,'/',1)=owner_id::text
  and ((media_type='photo' and mime_type in ('image/jpeg','image/png','image/webp','image/gif') and size_bytes<=10485760)
    or (media_type='audio' and mime_type in ('audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/aac') and size_bytes<=20971520)));
drop policy if exists "members remove own message media" on public.message_media;
create policy "members remove own message media" on public.message_media
for delete to authenticated using(owner_id=(select auth.uid())
  and private.can_access_conversation(conversation_id,(select auth.uid())));

create table if not exists public.conversation_clears (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
alter table public.conversation_clears enable row level security;
grant select,insert,update on public.conversation_clears to authenticated;
drop policy if exists "members read own conversation clears" on public.conversation_clears;
create policy "members read own conversation clears" on public.conversation_clears for select to authenticated
using(user_id=(select auth.uid()) and private.can_access_conversation(conversation_id,(select auth.uid())));
drop policy if exists "members set own conversation clears" on public.conversation_clears;
create policy "members set own conversation clears" on public.conversation_clears for insert to authenticated
with check(user_id=(select auth.uid()) and private.can_access_conversation(conversation_id,(select auth.uid())));
drop policy if exists "members update own conversation clears" on public.conversation_clears;
create policy "members update own conversation clears" on public.conversation_clears for update to authenticated
using(user_id=(select auth.uid()) and private.can_access_conversation(conversation_id,(select auth.uid())))
with check(user_id=(select auth.uid()) and private.can_access_conversation(conversation_id,(select auth.uid())));
create or replace function public.clear_my_conversation(p_conversation_id uuid)
returns timestamptz language plpgsql security invoker set search_path=public,private as $$
declare cutoff timestamptz;
begin
  if not private.can_access_conversation(p_conversation_id,(select auth.uid())) then raise exception 'Acesso negado.'; end if;
  insert into public.conversation_clears(conversation_id,user_id,cleared_at)
  values(p_conversation_id,(select auth.uid()),now())
  on conflict(conversation_id,user_id) do update set cleared_at=excluded.cleared_at
  returning cleared_at into cutoff;
  return cutoff;
end;
$$;
revoke all on function public.clear_my_conversation(uuid) from public,anon;
grant execute on function public.clear_my_conversation(uuid) to authenticated;

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check(reaction in ('like','love','laugh','wow','sad','fire')),
  created_at timestamptz not null default now(),
  primary key(message_id,user_id,reaction)
);
alter table public.message_reactions enable row level security;
grant select, insert, delete on public.message_reactions to authenticated;
drop policy if exists "conversation members read message reactions" on public.message_reactions;
create policy "conversation members read message reactions" on public.message_reactions for select to authenticated
using(exists(select 1 from public.messages m where m.id=message_id
  and private.can_access_conversation(m.conversation_id,(select auth.uid()))));
drop policy if exists "members react in own conversations" on public.message_reactions;
create policy "members react in own conversations" on public.message_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and private.user_is_active((select auth.uid()))
  and exists(select 1 from public.messages m where m.id=message_id
    and private.can_access_conversation(m.conversation_id,(select auth.uid()))));
drop policy if exists "members remove own reactions" on public.message_reactions;
create policy "members remove own reactions" on public.message_reactions for delete to authenticated
using(user_id=(select auth.uid()));

create index if not exists message_media_conversation_idx on public.message_media(conversation_id,created_at);
create index if not exists message_reactions_message_idx on public.message_reactions(message_id);

