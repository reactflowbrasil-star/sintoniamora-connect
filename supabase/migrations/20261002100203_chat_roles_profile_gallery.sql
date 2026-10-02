alter table private.user_roles drop constraint if exists user_roles_role_check;
alter table private.user_roles add constraint user_roles_role_check check(role in ('admin','super_admin','moderator'));

create or replace function private.is_moderator()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.user_roles r where r.user_id=(select auth.uid()) and r.role='moderator')
$$;
revoke all on function private.is_moderator() from public,anon;
grant execute on function private.is_moderator() to authenticated;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.user_roles r where r.user_id=(select auth.uid()) and r.role='super_admin')
$$;
revoke all on function private.is_super_admin() from public,anon;
grant execute on function private.is_super_admin() to authenticated;

create or replace function private.admin_set_user_role(p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path='' as $$
declare acting_admin uuid:=(select auth.uid()); target_role text;
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  if acting_admin is null or p_user_id is null or p_user_id=acting_admin then raise exception 'Não é possível alterar o próprio papel.'; end if;
  if p_role not in ('member','moderator','admin') then raise exception 'Papel inválido.'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Usuário não encontrado.'; end if;
  select role into target_role from private.user_roles where user_id=p_user_id;
  if target_role='super_admin' then raise exception 'O administrador geral não pode ser alterado por esta ação.' using errcode='42501'; end if;
  if target_role='admin' and not private.is_super_admin() then raise exception 'Somente o administrador geral pode alterar o acesso de um administrador.' using errcode='42501'; end if;
  if p_role='admin' and not private.is_super_admin() then raise exception 'Somente o administrador geral pode conceder acesso de administrador.' using errcode='42501'; end if;
  if p_role='member' then
    delete from private.user_roles where user_id=p_user_id;
  else
    insert into private.user_roles(user_id,role) values(p_user_id,p_role)
    on conflict(user_id) do update set role=excluded.role;
  end if;
  insert into private.admin_audit_log(admin_id,action,target_user_id,details)
    values(acting_admin,'user_role_changed',p_user_id,jsonb_build_object('role',p_role));
end $$;
revoke all on function private.admin_set_user_role(uuid,text) from public,anon;
grant execute on function private.admin_set_user_role(uuid,text) to authenticated;

create or replace function public.current_user_moderator()
returns boolean language sql stable security invoker set search_path='' as $$ select private.is_moderator() $$;
create or replace function public.current_user_super_admin()
returns boolean language sql stable security invoker set search_path='' as $$ select private.is_super_admin() $$;
create or replace function public.admin_set_user_role(p_user_id uuid,p_role text)
returns void language sql security invoker set search_path='' as $$ select private.admin_set_user_role(p_user_id,p_role) $$;
revoke all on function public.current_user_moderator() from public,anon;
revoke all on function public.current_user_super_admin() from public,anon;
revoke all on function public.admin_set_user_role(uuid,text) from public,anon;
grant execute on function public.current_user_moderator(),public.current_user_super_admin(),public.admin_set_user_role(uuid,text) to authenticated;

create or replace function private.admin_list_reports(p_status text default 'PENDING',p_limit integer default 50)
returns table(report_id uuid,reporter_id uuid,reporter_name text,target_user_id uuid,target_name text,target_post_id uuid,post_body text,reason text,details text,status text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (private.is_admin() or private.is_moderator()) then raise exception 'Acesso restrito à equipe de moderação.' using errcode='42501'; end if;
  return query select r.id,r.reporter_id,reporter.display_name,r.target_user_id,target.display_name,r.target_post_id,left(p.body,280),r.reason,r.details,r.status,r.created_at
  from public.reports r left join public.profiles reporter on reporter.id=r.reporter_id left join public.profiles target on target.id=r.target_user_id left join public.posts p on p.id=r.target_post_id
  where p_status='ALL' or r.status=p_status order by r.created_at desc limit greatest(1,least(coalesce(p_limit,50),100));
end $$;

create or replace function private.admin_update_report(p_report_id uuid,p_status text,p_post_status text default null)
returns void language plpgsql security definer set search_path='' as $$
declare acting_admin uuid:=(select auth.uid()); target_post uuid;
begin
  if not (private.is_admin() or private.is_moderator()) then raise exception 'Acesso restrito à equipe de moderação.' using errcode='42501'; end if;
  if p_status not in ('PENDING','REVIEWING','RESOLVED','DISMISSED') then raise exception 'Status inválido.'; end if;
  if private.is_moderator() and not private.is_admin() and p_post_status is not null and p_post_status not in ('HIDDEN','REMOVED') then
    raise exception 'Moderadores podem ocultar ou remover publicações, mas não restaurá-las.' using errcode='42501';
  end if;
  select target_post_id into target_post from public.reports where id=p_report_id;
  if not found then raise exception 'Denúncia não encontrada.'; end if;
  update public.reports set status=p_status where id=p_report_id;
  if target_post is not null and p_post_status is not null then
    if p_post_status not in ('PUBLISHED','HIDDEN','REMOVED') then raise exception 'Status da publicação inválido.'; end if;
    update public.posts set status=p_post_status where id=target_post;
  end if;
  insert into private.admin_audit_log(admin_id,action,details) values(acting_admin,'report_reviewed',jsonb_build_object('report_id',p_report_id,'status',p_status,'post_status',p_post_status));
end $$;

create or replace function private.start_conversation(other_member uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_member uuid:=(select auth.uid()); created_conversation_id uuid;
begin
  if current_member is null or other_member is null or current_member=other_member then raise exception 'Participante inválido.' using errcode='22023'; end if;
  if not private.user_is_active(current_member) or exists(select 1 from private.user_access a where a.user_id=other_member and a.status='suspended') then raise exception 'Uma das contas não pode usar o bate-papo.' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=other_member) then raise exception 'Perfil não encontrado.'; end if;
  if private.are_blocked(current_member,other_member) then raise exception 'Não é possível iniciar esta conversa.' using errcode='42501'; end if;
  select mine.conversation_id into created_conversation_id
  from public.conversation_members mine join public.conversation_members theirs on theirs.conversation_id=mine.conversation_id
  where mine.user_id=current_member and theirs.user_id=other_member limit 1;
  if created_conversation_id is null then
    insert into public.conversations(created_by) values(current_member) returning id into created_conversation_id;
    insert into public.conversation_members(conversation_id,user_id) values(created_conversation_id,current_member);
    insert into public.conversation_members(conversation_id,user_id) values(created_conversation_id,other_member);
  end if;
  return created_conversation_id;
end $$;
revoke all on function private.start_conversation(uuid) from public,anon;
grant execute on function private.start_conversation(uuid) to authenticated;
create or replace function public.start_conversation(other_member uuid)
returns uuid language sql security invoker set search_path='' as $$ select private.start_conversation(other_member) $$;
revoke all on function public.start_conversation(uuid) from public,anon;
grant execute on function public.start_conversation(uuid) to authenticated;

alter table public.profiles add column if not exists cover_path text;
drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile" on public.profiles for update to authenticated
using(id=(select auth.uid())) with check(
  id=(select auth.uid())
  and (avatar_path is null or exists(select 1 from public.profile_media pm where pm.object_path=avatar_path and pm.user_id=(select auth.uid()) and pm.media_type='photo'))
  and (cover_path is null or exists(select 1 from public.profile_media pm where pm.object_path=cover_path and pm.user_id=(select auth.uid()) and pm.media_type='photo'))
);

drop policy if exists "members read own media and discoverable avatars" on public.profile_media;
create policy "members read profile gallery media" on public.profile_media for select to authenticated
using(user_id=(select auth.uid()) or (private.user_is_active((select auth.uid())) and not private.are_blocked(user_id,(select auth.uid()))));
drop policy if exists "members read own uploads and discoverable avatars" on storage.objects;
create policy "members read own uploads and profile galleries" on storage.objects for select to authenticated
using(bucket_id='profile-media' and private.user_is_active((select auth.uid())) and (
  (storage.foldername(name))[1]=((select auth.uid()))::text or exists(
    select 1 from public.profile_media pm where pm.object_path=storage.objects.name
    and not private.are_blocked(pm.user_id,(select auth.uid()))
  )
));
