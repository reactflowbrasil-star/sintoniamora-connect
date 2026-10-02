-- Break the profile_media -> storage.objects -> profile_media RLS cycle.
-- The private helper checks only the authenticated user's own Storage path.
create or replace function private.owns_profile_media_object(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and p_object_path is not null
    and (storage.foldername(p_object_path))[1] = (select auth.uid())::text
    and exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'profile-media'
        and o.name = p_object_path
    );
$function$;

revoke all on function private.owns_profile_media_object(text) from public, anon;
grant execute on function private.owns_profile_media_object(text) to authenticated;

drop policy if exists "members add own media metadata" on public.profile_media;
create policy "members add own media metadata" on public.profile_media
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.user_is_active((select auth.uid()))
  and private.owns_profile_media_object(object_path)
);
