drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile" on public.profiles for update to authenticated
using(id=(select auth.uid())) with check(
 id=(select auth.uid())
 and (avatar_path is null or exists(select 1 from public.profile_media pm where pm.object_path=avatar_path and pm.user_id=(select auth.uid()) and pm.media_type='photo'))
 and (cover_path is null or exists(select 1 from public.profile_media pm where pm.object_path=cover_path and pm.user_id=(select auth.uid()) and pm.media_type='photo'))
);

create or replace function private.admin_set_user_role(p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path='' as $$
declare acting_admin uuid:=(select auth.uid()); target_role text;
begin
 if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
 if acting_admin is null or p_user_id is null or p_user_id=acting_admin then raise exception 'Não é possível alterar o próprio papel.'; end if;
 if p_role is null or p_role not in ('member','moderator','admin') then raise exception 'Papel inválido.'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Usuário não encontrado.'; end if;
 select role into target_role from private.user_roles where user_id=p_user_id;
 if target_role in ('admin','super_admin') and not private.is_super_admin() then raise exception 'Somente o administrador geral pode alterar o acesso de outro administrador.' using errcode='42501'; end if;
 if p_role='admin' and not private.is_super_admin() then raise exception 'Somente o administrador geral pode conceder acesso de administrador.' using errcode='42501'; end if;
 if target_role='super_admin' and (select count(*) from private.user_roles where role='super_admin')<=1 then raise exception 'O sistema precisa manter ao menos um administrador geral.'; end if;
 if p_role='member' then delete from private.user_roles where user_id=p_user_id;
 else insert into private.user_roles(user_id,role) values(p_user_id,p_role) on conflict(user_id) do update set role=excluded.role;
 end if;
 insert into private.admin_audit_log(admin_id,action,target_user_id,details) values(acting_admin,'user_role_changed',p_user_id,jsonb_build_object('role',p_role));
end $$;
revoke all on function private.admin_set_user_role(uuid,text) from public,anon;
grant execute on function private.admin_set_user_role(uuid,text) to authenticated;
