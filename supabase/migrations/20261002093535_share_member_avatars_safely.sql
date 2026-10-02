drop policy if exists "profiles visible to signed-in members" on public.profiles;
create policy "profiles visible to signed-in members" on public.profiles
  for select to authenticated
  using (
    private.user_is_active((select auth.uid()))
    and not private.are_blocked(id, (select auth.uid()))
  );

drop policy if exists "members read own media" on public.profile_media;
create policy "members read own media and discoverable avatars" on public.profile_media
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      media_type = 'photo'
      and private.user_is_active((select auth.uid()))
      and exists (
        select 1 from public.profiles p
        where p.id = profile_media.user_id and p.avatar_path = profile_media.object_path
      )
      and not private.are_blocked(user_id, (select auth.uid()))
    )
  );

drop policy if exists "members read own uploads only when active" on storage.objects;
create policy "members read own uploads and discoverable avatars" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-media'
    and private.user_is_active((select auth.uid()))
    and (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      or exists (
        select 1
        from public.profile_media pm
        join public.profiles p on p.id = pm.user_id and p.avatar_path = pm.object_path
        where pm.object_path = storage.objects.name
          and pm.media_type = 'photo'
          and not private.are_blocked(pm.user_id, (select auth.uid()))
      )
    )
  );
