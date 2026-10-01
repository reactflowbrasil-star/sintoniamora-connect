alter table public.profiles add column if not exists avatar_path text references public.profile_media(object_path) on delete set null;
drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and (avatar_path is null or exists (
    select 1 from public.profile_media pm
    where pm.object_path = avatar_path and pm.user_id = (select auth.uid())
  ))
);
