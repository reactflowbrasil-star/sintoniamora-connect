-- Harden internal trigger functions and add indexes for member queries.
revoke all on function public.create_sintoniamora_member() from public, anon, authenticated;
revoke all on function public.guard_profile_media_upload() from public, anon, authenticated;
grant select on public.terms_acceptances to authenticated;
create policy "members read own terms acceptances" on public.terms_acceptances for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "members create own profile" on public.profiles;
create policy "members create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "private profile is self only" on public.private_profiles;
create policy "private profile is self only" on public.private_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "members read own subscription" on public.subscriptions;
create policy "members read own subscription" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "members read own media" on public.profile_media;
create policy "members read own media" on public.profile_media for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "members add own media metadata" on public.profile_media;
create policy "members add own media metadata" on public.profile_media for insert to authenticated with check (
 user_id = (select auth.uid()) and exists (
   select 1 from storage.objects o where o.bucket_id='profile-media' and o.name=object_path
 )
);
drop policy if exists "members remove own media metadata" on public.profile_media;
create policy "members remove own media metadata" on public.profile_media for delete to authenticated using (user_id = (select auth.uid()));

create index if not exists profile_media_user_created_idx on public.profile_media(user_id, created_at desc);
create index if not exists subscriptions_user_plan_status_idx on public.subscriptions(user_id, plan_id, status);
create index if not exists terms_acceptances_user_idx on public.terms_acceptances(user_id);
