-- Private RBAC, account suspension, audit history, and guarded admin operations.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);
create table if not exists private.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reason text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists private.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table private.user_roles enable row level security;
alter table private.user_access enable row level security;
alter table private.admin_audit_log enable row level security;
revoke all on private.user_roles, private.user_access, private.admin_audit_log from public, anon, authenticated;

-- Bootstrap the explicitly designated first admin without embedding the address in the client.
insert into private.user_roles(user_id, role)
select id, 'super_admin' from auth.users where lower(email) = lower('alexandrelimacardoso@gmail.com')
on conflict (user_id) do update set role = excluded.role;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.user_roles r where r.user_id = (select auth.uid()))
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.user_is_active(member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from private.user_access a where a.user_id = member_id and a.status = 'suspended')
$$;
revoke all on function private.user_is_active(uuid) from public, anon;
grant execute on function private.user_is_active(uuid) to authenticated;
grant execute on function private.user_is_active(uuid) to service_role;

create or replace function public.current_user_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin()
$$;
revoke all on function public.current_user_admin() from public, anon;
grant execute on function public.current_user_admin() to authenticated;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'active_users', (select count(*) from auth.users u where private.user_is_active(u.id)),
    'suspended_users', (select count(*) from private.user_access where status = 'suspended'),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'ACTIVE'),
    'premium_subscriptions', (select count(*) from public.subscriptions where status = 'ACTIVE' and plan_id = 'premium'),
    'pending_reports', (select count(*) from public.reports where status in ('PENDING','REVIEWING')),
    'live_now', (select count(*) from public.live_sessions where status = 'LIVE')
  ) into result;
  return result;
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_list_users(p_search text default '', p_limit integer default 50, p_offset integer default 0)
returns table(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  display_name text, city text, state text, access_status text, access_reason text,
  plan_id text, plan_status text, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  return query
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, p.display_name, p.city, p.state,
    coalesce(a.status, 'active'), coalesce(a.reason, ''), s.plan_id, s.status, r.role
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join private.user_access a on a.user_id = u.id
  left join lateral (select sub.plan_id, sub.status from public.subscriptions sub
    where sub.user_id = u.id order by (sub.status = 'ACTIVE') desc, sub.created_at desc limit 1) s on true
  left join private.user_roles r on r.user_id = u.id
  where coalesce(p.display_name, '') ilike '%' || coalesce(p_search, '') || '%'
    or coalesce(u.email, '') ilike '%' || coalesce(p_search, '') || '%'
  order by u.created_at desc limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.admin_list_users(text, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

create or replace function public.admin_set_user_access(p_user_id uuid, p_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare acting_admin uuid := auth.uid();
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if p_user_id = acting_admin then raise exception 'Não é possível suspender a própria conta.'; end if;
  if p_status not in ('active','suspended') then raise exception 'Status inválido.'; end if;
  insert into private.user_access(user_id,status,reason,updated_at,updated_by)
    values(p_user_id,p_status,left(coalesce(p_reason,''),500),now(),acting_admin)
    on conflict(user_id) do update set status=excluded.status, reason=excluded.reason, updated_at=now(), updated_by=acting_admin;
  insert into private.admin_audit_log(admin_id,action,target_user_id,details)
    values(acting_admin,'user_access_changed',p_user_id,jsonb_build_object('status',p_status,'reason',left(coalesce(p_reason,''),500)));
end $$;
revoke all on function public.admin_set_user_access(uuid,text,text) from public, anon;
grant execute on function public.admin_set_user_access(uuid,text,text) to authenticated;

create or replace function public.admin_set_user_plan(p_user_id uuid, p_plan_id text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare acting_admin uuid := auth.uid();
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if p_status not in ('PENDING','ACTIVE','PAST_DUE','CANCELED','EXPIRED','REFUNDED') then raise exception 'Status de plano inválido.'; end if;
  if not exists(select 1 from public.subscription_plans p where p.id=p_plan_id) then raise exception 'Plano inexistente.'; end if;
  update public.subscriptions set status='EXPIRED' where user_id=p_user_id and status='ACTIVE';
  insert into public.subscriptions(user_id,plan_id,status) values(p_user_id,p_plan_id,p_status);
  insert into private.admin_audit_log(admin_id,action,target_user_id,details)
    values(acting_admin,'user_plan_changed',p_user_id,jsonb_build_object('plan_id',p_plan_id,'status',p_status));
end $$;
revoke all on function public.admin_set_user_plan(uuid,text,text) from public, anon;
grant execute on function public.admin_set_user_plan(uuid,text,text) to authenticated;

create or replace function public.admin_save_plan(p_plan_id text, p_name text, p_price_cents integer, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if p_plan_id !~ '^[a-z0-9_-]{2,40}$' or p_name is null or char_length(trim(p_name)) not between 2 and 80 or p_price_cents < 0 then
    raise exception 'Dados do plano inválidos.';
  end if;
  insert into public.subscription_plans(id,name,price_cents,active) values(p_plan_id,trim(p_name),p_price_cents,p_active)
  on conflict(id) do update set name=excluded.name,price_cents=excluded.price_cents,active=excluded.active;
  insert into private.admin_audit_log(admin_id,action,details)
    values(auth.uid(),'plan_saved',jsonb_build_object('plan_id',p_plan_id,'price_cents',p_price_cents,'active',p_active));
end $$;
revoke all on function public.admin_save_plan(text,text,integer,boolean) from public, anon;
grant execute on function public.admin_save_plan(text,text,integer,boolean) to authenticated;

create or replace function public.admin_save_plan_feature(p_plan_id text, p_feature_key text, p_feature_value integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if p_feature_key !~ '^[a-z0-9_]{2,60}$' or p_feature_value < 0 then raise exception 'Recurso inválido.'; end if;
  insert into public.plan_features(plan_id,feature_key,feature_value) values(p_plan_id,p_feature_key,p_feature_value)
  on conflict(plan_id,feature_key) do update set feature_value=excluded.feature_value;
  insert into private.admin_audit_log(admin_id,action,details)
    values(auth.uid(),'plan_feature_saved',jsonb_build_object('plan_id',p_plan_id,'feature_key',p_feature_key,'feature_value',p_feature_value));
end $$;
revoke all on function public.admin_save_plan_feature(text,text,integer) from public, anon;
grant execute on function public.admin_save_plan_feature(text,text,integer) to authenticated;

create or replace function public.admin_list_reports(p_status text default 'PENDING', p_limit integer default 50)
returns table(report_id uuid, reporter_id uuid, reporter_name text, target_user_id uuid,
  target_name text, target_post_id uuid, post_body text, reason text, details text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  return query select r.id,r.reporter_id,reporter.display_name,r.target_user_id,target.display_name,
    r.target_post_id,left(p.body,280),r.reason,r.details,r.status,r.created_at
    from public.reports r left join public.profiles reporter on reporter.id=r.reporter_id
    left join public.profiles target on target.id=r.target_user_id left join public.posts p on p.id=r.target_post_id
    where p_status='ALL' or r.status=p_status order by r.created_at desc limit greatest(1,least(coalesce(p_limit,50),100));
end $$;
revoke all on function public.admin_list_reports(text,integer) from public, anon;
grant execute on function public.admin_list_reports(text,integer) to authenticated;

create or replace function public.admin_update_report(p_report_id uuid, p_status text, p_post_status text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare acting_admin uuid := auth.uid(); target_post uuid;
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if p_status not in ('PENDING','REVIEWING','RESOLVED','DISMISSED') then raise exception 'Status inválido.'; end if;
  select target_post_id into target_post from public.reports where id=p_report_id;
  if not found then raise exception 'Denúncia não encontrada.'; end if;
  update public.reports set status=p_status where id=p_report_id;
  if target_post is not null and p_post_status is not null then
    if p_post_status not in ('PUBLISHED','HIDDEN','REMOVED') then raise exception 'Status da publicação inválido.'; end if;
    update public.posts set status=p_post_status where id=target_post;
  end if;
  insert into private.admin_audit_log(admin_id,action,details)
    values(acting_admin,'report_reviewed',jsonb_build_object('report_id',p_report_id,'status',p_status,'post_status',p_post_status));
end $$;
revoke all on function public.admin_update_report(uuid,text,text) from public, anon;
grant execute on function public.admin_update_report(uuid,text,text) to authenticated;

-- Allow members to edit their own profile only; administrators use the RPCs above.
-- Enforce suspensions at the database boundary, including Storage.
create policy "members update own profile" on public.profiles for update to authenticated
  using(id=(select auth.uid()) and private.user_is_active((select auth.uid())))
  with check(id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "members create own profile" on public.profiles;
create policy "members create own profile" on public.profiles for insert to authenticated
  with check(id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "members add own media metadata" on public.profile_media;
create policy "members add own media metadata" on public.profile_media for insert to authenticated
  with check(user_id=(select auth.uid()) and private.user_is_active((select auth.uid()))
    and exists(select 1 from storage.objects o where o.bucket_id='profile-media' and o.name=object_path));
drop policy if exists "members block others" on public.blocks;
create policy "members block others" on public.blocks for insert to authenticated
  with check(blocker_id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "members publish own posts" on public.posts;
create policy "members publish own posts" on public.posts for insert to authenticated
  with check(author_id=(select auth.uid()) and status='PUBLISHED' and private.user_is_active((select auth.uid())));
drop policy if exists "members like visible posts" on public.likes;
create policy "members like visible posts" on public.likes for insert to authenticated
  with check(user_id=(select auth.uid()) and private.user_is_active((select auth.uid())) and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "members comment on visible posts" on public.comments;
create policy "members comment on visible posts" on public.comments for insert to authenticated
  with check(user_id=(select auth.uid()) and private.user_is_active((select auth.uid())) and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "members follow others" on public.follows;
create policy "members follow others" on public.follows for insert to authenticated
  with check(follower_id=(select auth.uid()) and private.user_is_active((select auth.uid())) and not private.are_blocked(follower_id,following_id));
drop policy if exists "members create reports" on public.reports;
create policy "members create reports" on public.reports for insert to authenticated
  with check(reporter_id=(select auth.uid()) and private.user_is_active((select auth.uid())) and status='PENDING' and target_user_id is distinct from (select auth.uid()));
drop policy if exists "members create conversations" on public.conversations;
create policy "members create conversations" on public.conversations for insert to authenticated
  with check(created_by=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "conversation creator adds members" on public.conversation_members;
create policy "conversation creator adds members" on public.conversation_members for insert to authenticated
  with check(private.user_is_active((select auth.uid())) and private.can_add_conversation_member(conversation_id,(select auth.uid()),user_id));
drop policy if exists "members send messages" on public.messages;
create policy "members send messages" on public.messages for insert to authenticated
  with check(sender_id=(select auth.uid()) and private.user_is_active((select auth.uid())) and private.can_access_conversation(conversation_id,(select auth.uid())));
drop policy if exists "members start own live" on public.live_sessions;
create policy "members start own live" on public.live_sessions for insert to authenticated
  with check(host_id=(select auth.uid()) and status='LIVE' and private.user_is_active((select auth.uid())));
drop policy if exists "members write active live chat" on public.live_chat_messages;
create policy "members write active live chat" on public.live_chat_messages for insert to authenticated
  with check(sender_id=(select auth.uid()) and private.user_is_active((select auth.uid())) and exists (
    select 1 from public.live_sessions ls where ls.id=session_id and ls.status='LIVE'
    and not private.are_blocked(ls.host_id,(select auth.uid()))));
drop policy if exists "member uploads own profile media" on storage.objects;
create policy "active members upload profile media" on storage.objects for insert to authenticated
  with check(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text
    and private.user_is_active((select auth.uid())));

grant select, insert, update, delete on public.subscription_plans, public.plan_features to authenticated;
create policy "admins manage plans" on public.subscription_plans for all to authenticated
  using(private.is_admin()) with check(private.is_admin());
create policy "admins manage plan features" on public.plan_features for all to authenticated
  using(private.is_admin()) with check(private.is_admin());

create policy "active members add conversation members" on public.conversation_members for insert to authenticated
  with check(private.user_is_active((select auth.uid())) and private.can_add_conversation_member(conversation_id,(select auth.uid()),user_id));

create policy "admins review reports" on public.reports for select to authenticated using(private.is_admin());
create policy "admins moderate posts" on public.posts for update to authenticated using(private.is_admin()) with check(private.is_admin());
grant update(status) on public.posts to authenticated;
create policy "admins update post status" on public.posts for update to authenticated
  using(private.is_admin()) with check(private.is_admin());

create index if not exists admin_audit_created_idx on private.admin_audit_log(created_at desc);
create index if not exists user_access_status_idx on private.user_access(status);

-- Privileged routines remain available only to signed-in users; every routine
-- that returns or changes admin data checks the role inside its transaction.
