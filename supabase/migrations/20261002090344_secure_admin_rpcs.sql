-- Keep elevated data access in a non-exposed schema. Public RPC wrappers below
-- are SECURITY INVOKER and can only call these routines as authenticated users.
alter table private.user_roles disable row level security;
alter table private.user_access disable row level security;
alter table private.admin_audit_log disable row level security;
create or replace function private.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  select jsonb_build_object(
    'users',(select count(*) from auth.users),
    'active_users',(select count(*) from auth.users u where private.user_is_active(u.id)),
    'suspended_users',(select count(*) from private.user_access where status='suspended'),
    'active_subscriptions',(select count(*) from public.subscriptions where status='ACTIVE'),
    'premium_subscriptions',(select count(*) from public.subscriptions where status='ACTIVE' and plan_id='premium'),
    'pending_reports',(select count(*) from public.reports where status in ('PENDING','REVIEWING')),
    'live_now',(select count(*) from public.live_sessions where status='LIVE')) into result;
  return result;
end $$;
revoke all on function private.admin_overview() from public,anon;
grant execute on function private.admin_overview() to authenticated;

create or replace function private.admin_list_users(p_search text default '',p_limit integer default 50,p_offset integer default 0)
returns table(user_id uuid,email text,created_at timestamptz,last_sign_in_at timestamptz,display_name text,city text,state text,access_status text,access_reason text,plan_id text,plan_status text,role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  return query select u.id,u.email::text,u.created_at,u.last_sign_in_at,p.display_name,p.city,p.state,
    coalesce(a.status,'active'),coalesce(a.reason,''),s.plan_id,s.status,r.role
  from auth.users u left join public.profiles p on p.id=u.id left join private.user_access a on a.user_id=u.id
  left join lateral(select sub.plan_id,sub.status from public.subscriptions sub where sub.user_id=u.id order by (sub.status='ACTIVE') desc,sub.created_at desc limit 1)s on true
  left join private.user_roles r on r.user_id=u.id
  where coalesce(p.display_name,'') ilike '%'||coalesce(p_search,'')||'%' or coalesce(u.email,'') ilike '%'||coalesce(p_search,'')||'%'
  order by u.created_at desc limit greatest(1,least(coalesce(p_limit,50),100)) offset greatest(coalesce(p_offset,0),0);
end $$;
revoke all on function private.admin_list_users(text,integer,integer) from public,anon;
grant execute on function private.admin_list_users(text,integer,integer) to authenticated;

create or replace function private.admin_set_user_access(p_user_id uuid,p_status text,p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare acting_admin uuid:=auth.uid();
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  if p_user_id=acting_admin then raise exception 'Não é possível suspender a própria conta.'; end if;
  if p_status not in ('active','suspended') then raise exception 'Status inválido.'; end if;
  insert into private.user_access(user_id,status,reason,updated_at,updated_by) values(p_user_id,p_status,left(coalesce(p_reason,''),500),now(),acting_admin)
  on conflict(user_id) do update set status=excluded.status,reason=excluded.reason,updated_at=now(),updated_by=acting_admin;
  insert into private.admin_audit_log(admin_id,action,target_user_id,details) values(acting_admin,'user_access_changed',p_user_id,jsonb_build_object('status',p_status,'reason',left(coalesce(p_reason,''),500)));
end $$;
revoke all on function private.admin_set_user_access(uuid,text,text) from public,anon;
grant execute on function private.admin_set_user_access(uuid,text,text) to authenticated;

create or replace function private.admin_set_user_plan(p_user_id uuid,p_plan_id text,p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare acting_admin uuid:=auth.uid();
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  if p_status not in ('PENDING','ACTIVE','PAST_DUE','CANCELED','EXPIRED','REFUNDED') then raise exception 'Status de plano inválido.'; end if;
  if not exists(select 1 from public.subscription_plans where id=p_plan_id) then raise exception 'Plano inexistente.'; end if;
  update public.subscriptions set status='EXPIRED' where user_id=p_user_id and status='ACTIVE';
  insert into public.subscriptions(user_id,plan_id,status) values(p_user_id,p_plan_id,p_status);
  insert into private.admin_audit_log(admin_id,action,target_user_id,details) values(acting_admin,'user_plan_changed',p_user_id,jsonb_build_object('plan_id',p_plan_id,'status',p_status));
end $$;
revoke all on function private.admin_set_user_plan(uuid,text,text) from public,anon;
grant execute on function private.admin_set_user_plan(uuid,text,text) to authenticated;

create or replace function private.admin_save_plan(p_plan_id text,p_name text,p_price_cents integer,p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  if p_plan_id !~ '^[a-z0-9_-]{2,40}$' or p_name is null or char_length(trim(p_name)) not between 2 and 80 or p_price_cents<0 then raise exception 'Dados do plano inválidos.'; end if;
  insert into public.subscription_plans(id,name,price_cents,active) values(p_plan_id,trim(p_name),p_price_cents,p_active)
  on conflict(id) do update set name=excluded.name,price_cents=excluded.price_cents,active=excluded.active;
  insert into private.admin_audit_log(admin_id,action,details) values(auth.uid(),'plan_saved',jsonb_build_object('plan_id',p_plan_id,'price_cents',p_price_cents,'active',p_active));
end $$;
revoke all on function private.admin_save_plan(text,text,integer,boolean) from public,anon;
grant execute on function private.admin_save_plan(text,text,integer,boolean) to authenticated;

create or replace function private.admin_save_plan_feature(p_plan_id text,p_feature_key text,p_feature_value integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  if p_feature_key !~ '^[a-z0-9_]{2,60}$' or p_feature_value<0 then raise exception 'Recurso inválido.'; end if;
  insert into public.plan_features(plan_id,feature_key,feature_value) values(p_plan_id,p_feature_key,p_feature_value)
  on conflict(plan_id,feature_key) do update set feature_value=excluded.feature_value;
  insert into private.admin_audit_log(admin_id,action,details) values(auth.uid(),'plan_feature_saved',jsonb_build_object('plan_id',p_plan_id,'feature_key',p_feature_key,'feature_value',p_feature_value));
end $$;
revoke all on function private.admin_save_plan_feature(text,text,integer) from public,anon;
grant execute on function private.admin_save_plan_feature(text,text,integer) to authenticated;

create or replace function private.admin_list_reports(p_status text default 'PENDING',p_limit integer default 50)
returns table(report_id uuid,reporter_id uuid,reporter_name text,target_user_id uuid,target_name text,target_post_id uuid,post_body text,reason text,details text,status text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  return query select r.id,r.reporter_id,reporter.display_name,r.target_user_id,target.display_name,r.target_post_id,left(p.body,280),r.reason,r.details,r.status,r.created_at
  from public.reports r left join public.profiles reporter on reporter.id=r.reporter_id left join public.profiles target on target.id=r.target_user_id left join public.posts p on p.id=r.target_post_id
  where p_status='ALL' or r.status=p_status order by r.created_at desc limit greatest(1,least(coalesce(p_limit,50),100));
end $$;
revoke all on function private.admin_list_reports(text,integer) from public,anon;
grant execute on function private.admin_list_reports(text,integer) to authenticated;

create or replace function private.admin_update_report(p_report_id uuid,p_status text,p_post_status text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare acting_admin uuid:=auth.uid(); target_post uuid;
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  if p_status not in ('PENDING','REVIEWING','RESOLVED','DISMISSED') then raise exception 'Status inválido.'; end if;
  select target_post_id into target_post from public.reports where id=p_report_id;
  if not found then raise exception 'Denúncia não encontrada.'; end if;
  update public.reports set status=p_status where id=p_report_id;
  if target_post is not null and p_post_status is not null then
    if p_post_status not in ('PUBLISHED','HIDDEN','REMOVED') then raise exception 'Status da publicação inválido.'; end if;
    update public.posts set status=p_post_status where id=target_post;
  end if;
  insert into private.admin_audit_log(admin_id,action,details) values(acting_admin,'report_reviewed',jsonb_build_object('report_id',p_report_id,'status',p_status,'post_status',p_post_status));
end $$;
revoke all on function private.admin_update_report(uuid,text,text) from public,anon;
grant execute on function private.admin_update_report(uuid,text,text) to authenticated;

-- SECURITY INVOKER wrappers preserve the stable PostgREST API while keeping all
-- SECURITY DEFINER implementation functions outside the exposed API schema.
create or replace function public.current_user_admin() returns boolean language sql stable security invoker set search_path = '' as $$ select private.is_admin() $$;
create or replace function public.admin_overview() returns jsonb language sql stable security invoker set search_path = '' as $$ select private.admin_overview() $$;
create or replace function public.admin_list_users(p_search text default '',p_limit integer default 50,p_offset integer default 0) returns table(user_id uuid,email text,created_at timestamptz,last_sign_in_at timestamptz,display_name text,city text,state text,access_status text,access_reason text,plan_id text,plan_status text,role text) language sql stable security invoker set search_path = '' as $$ select * from private.admin_list_users(p_search,p_limit,p_offset) $$;
create or replace function public.admin_set_user_access(p_user_id uuid,p_status text,p_reason text default '') returns void language sql security invoker set search_path = '' as $$ select private.admin_set_user_access(p_user_id,p_status,p_reason) $$;
create or replace function public.admin_set_user_plan(p_user_id uuid,p_plan_id text,p_status text) returns void language sql security invoker set search_path = '' as $$ select private.admin_set_user_plan(p_user_id,p_plan_id,p_status) $$;
create or replace function public.admin_save_plan(p_plan_id text,p_name text,p_price_cents integer,p_active boolean) returns void language sql security invoker set search_path = '' as $$ select private.admin_save_plan(p_plan_id,p_name,p_price_cents,p_active) $$;
create or replace function public.admin_save_plan_feature(p_plan_id text,p_feature_key text,p_feature_value integer) returns void language sql security invoker set search_path = '' as $$ select private.admin_save_plan_feature(p_plan_id,p_feature_key,p_feature_value) $$;
create or replace function public.admin_list_reports(p_status text default 'PENDING',p_limit integer default 50) returns table(report_id uuid,reporter_id uuid,reporter_name text,target_user_id uuid,target_name text,target_post_id uuid,post_body text,reason text,details text,status text,created_at timestamptz) language sql stable security invoker set search_path = '' as $$ select * from private.admin_list_reports(p_status,p_limit) $$;
create or replace function public.admin_update_report(p_report_id uuid,p_status text,p_post_status text default null) returns void language sql security invoker set search_path = '' as $$ select private.admin_update_report(p_report_id,p_status,p_post_status) $$;
revoke all on function public.current_user_admin() from public,anon;
revoke all on function public.admin_overview() from public,anon;
revoke all on function public.admin_list_users(text,integer,integer) from public,anon;
revoke all on function public.admin_set_user_access(uuid,text,text) from public,anon;
revoke all on function public.admin_set_user_plan(uuid,text,text) from public,anon;
revoke all on function public.admin_save_plan(text,text,integer,boolean) from public,anon;
revoke all on function public.admin_save_plan_feature(text,text,integer) from public,anon;
revoke all on function public.admin_list_reports(text,integer) from public,anon;
revoke all on function public.admin_update_report(uuid,text,text) from public,anon;
grant execute on function public.current_user_admin(),public.admin_overview(),public.admin_list_users(text,integer,integer),public.admin_set_user_access(uuid,text,text),public.admin_set_user_plan(uuid,text,text),public.admin_save_plan(text,text,integer,boolean),public.admin_save_plan_feature(text,text,integer),public.admin_list_reports(text,integer),public.admin_update_report(uuid,text,text) to authenticated;

drop policy if exists "conversation creator adds members" on public.conversation_members;
drop policy if exists "admins review reports" on public.reports;
drop policy if exists "admins manage plans" on public.subscription_plans;
drop policy if exists "admins manage plan features" on public.plan_features;
drop policy if exists "plans readable" on public.subscription_plans;
drop policy if exists "features readable" on public.plan_features;
drop policy if exists "members read own reports" on public.reports;
create policy "plans readable" on public.subscription_plans for select to anon,authenticated using(active or private.is_admin());
create policy "features readable" on public.plan_features for select to anon,authenticated using(true);
create policy "admins insert plans" on public.subscription_plans for insert to authenticated with check(private.is_admin());
create policy "admins update plans" on public.subscription_plans for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "admins delete plans" on public.subscription_plans for delete to authenticated using(private.is_admin());
create policy "admins insert plan features" on public.plan_features for insert to authenticated with check(private.is_admin());
create policy "admins update plan features" on public.plan_features for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "admins delete plan features" on public.plan_features for delete to authenticated using(private.is_admin());
create policy "members read own reports" on public.reports for select to authenticated using((reporter_id=(select auth.uid()) and private.user_is_active((select auth.uid()))) or private.is_admin());

create index if not exists admin_audit_admin_idx on private.admin_audit_log(admin_id);
create index if not exists admin_audit_target_idx on private.admin_audit_log(target_user_id);
create index if not exists user_access_updated_by_idx on private.user_access(updated_by);

create or replace function private.can_access_conversation(target_conversation uuid,member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid()=member and private.user_is_active(member)
    and exists(select 1 from public.conversation_members own where own.conversation_id=target_conversation and own.user_id=member)
    and not exists(select 1 from public.conversation_members other where other.conversation_id=target_conversation and private.are_blocked(other.user_id,member))
$$;
revoke all on function private.can_access_conversation(uuid,uuid) from public,anon;
grant execute on function private.can_access_conversation(uuid,uuid) to authenticated;

drop policy if exists "profiles visible to signed-in members" on public.profiles;
create policy "profiles visible to signed-in members" on public.profiles for select to authenticated
  using(private.user_is_active((select auth.uid())) and (id=(select auth.uid()) or not private.are_blocked(id,(select auth.uid()))));
drop policy if exists "members see active unblocked lives" on public.live_sessions;
create policy "members see active unblocked lives" on public.live_sessions for select to authenticated
  using(status='LIVE' and private.user_is_active((select auth.uid())) and not private.are_blocked(host_id,(select auth.uid())));
drop policy if exists "members read active live chat" on public.live_chat_messages;
create policy "members read active live chat" on public.live_chat_messages for select to authenticated
  using(private.user_is_active((select auth.uid())) and exists(select 1 from public.live_sessions ls where ls.id=session_id and ls.status='LIVE' and not private.are_blocked(ls.host_id,(select auth.uid()))));
drop policy if exists "members read own media" on public.profile_media;
create policy "members read own media" on public.profile_media for select to authenticated
  using(user_id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "members read own subscription" on public.subscriptions;
create policy "members read own subscription" on public.subscriptions for select to authenticated
  using(user_id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "private profile is self only" on public.private_profiles;
create policy "private profile is self only" on public.private_profiles for select to authenticated
  using(user_id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "members read own notifications" on public.notifications;
create policy "members read own notifications" on public.notifications for select to authenticated
  using(recipient_id=(select auth.uid()) and private.user_is_active((select auth.uid())));
drop policy if exists "members read visible posts" on public.posts;
create policy "members read visible posts" on public.posts for select to authenticated
  using(status='PUBLISHED' and private.user_is_active((select auth.uid())) and not private.are_blocked(author_id,(select auth.uid())));
drop policy if exists "members read likes on visible posts" on public.likes;
create policy "members read likes on visible posts" on public.likes for select to authenticated
  using(private.user_is_active((select auth.uid())) and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "members read comments on visible posts" on public.comments;
create policy "members read comments on visible posts" on public.comments for select to authenticated
  using(private.user_is_active((select auth.uid())) and exists(select 1 from public.posts p where p.id=post_id) and not private.are_blocked(user_id,(select auth.uid())));
drop policy if exists "members read own follows" on public.follows;
drop policy if exists "members read own profile media" on storage.objects;
create policy "members read own follows" on public.follows for select to authenticated
  using(follower_id=(select auth.uid()) and private.user_is_active((select auth.uid())));
create policy "members read own uploads only when active" on storage.objects for select to authenticated
  using(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text and private.user_is_active((select auth.uid())));
