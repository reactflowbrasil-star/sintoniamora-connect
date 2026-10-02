create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.user_roles r where r.user_id=(select auth.uid()) and r.role in ('admin','super_admin'))
$$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;
