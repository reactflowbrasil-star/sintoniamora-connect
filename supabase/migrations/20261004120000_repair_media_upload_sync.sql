-- Restore consistent, secure handling for private media uploads. Idempotent.

-- The binary object is held by the server, so this validator checks the caller,
-- ownership path, limits, and MIME metadata without querying Supabase Storage.
create or replace function public.register_profile_media(
  p_object_path text,
  p_media_type text,
  p_mime_type text,
  p_size_bytes bigint
) returns public.profile_media
language plpgsql security invoker set search_path=public as $$
declare result public.profile_media;
begin
  if auth.uid() is null or split_part(p_object_path, '/', 1) <> auth.uid()::text then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  insert into public.profile_media(user_id, object_path, media_type, mime_type, size_bytes)
  values (auth.uid(), p_object_path, p_media_type, p_mime_type, p_size_bytes)
  returning * into result;
  return result;
end;
$$;
revoke all on function public.register_profile_media(text,text,text,bigint) from public, anon;
grant execute on function public.register_profile_media(text,text,text,bigint) to authenticated;

-- Restore the message-media policies used by the private server storage flow.
grant select, insert, delete on public.message_media to authenticated;
alter table public.message_media enable row level security;
drop policy if exists "conversation members read message media" on public.message_media;
create policy "conversation members read message media" on public.message_media
for select to authenticated using (
  private.can_access_conversation(conversation_id, (select auth.uid()))
  and private.user_is_active((select auth.uid()))
);
drop policy if exists "members attach media to own conversations" on public.message_media;
create policy "members attach media to own conversations" on public.message_media
for insert to authenticated with check (
  owner_id = (select auth.uid())
  and private.can_access_conversation(conversation_id, (select auth.uid()))
  and private.user_is_active((select auth.uid()))
  and message_id is not null
  and split_part(object_path, '/', 1) = owner_id::text
  and exists (
    select 1 from public.messages m
    where m.id = public.message_media.message_id
      and m.conversation_id = public.message_media.conversation_id
      and m.sender_id = (select auth.uid())
  )
  and ((media_type = 'photo' and mime_type in ('image/jpeg','image/png','image/webp','image/gif') and size_bytes <= 10485760)
    or (media_type = 'audio' and mime_type in ('audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/aac') and size_bytes <= 20971520))
);
drop policy if exists "members remove own message media" on public.message_media;
create policy "members remove own message media" on public.message_media
for delete to authenticated using (
  owner_id = (select auth.uid())
  and private.can_access_conversation(conversation_id, (select auth.uid()))
);

-- Clients need to update the avatar and cover references after upload.
grant update (avatar_path, cover_path, cover_position_x, cover_position_y)
on public.profiles to authenticated;
