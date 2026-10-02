create or replace function private.user_is_active(member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (member_id=(select auth.uid()) or private.is_admin())
    and not exists(select 1 from private.user_access a where a.user_id=member_id and a.status='suspended')
$$;
revoke all on function private.user_is_active(uuid) from public,anon;
grant execute on function private.user_is_active(uuid) to authenticated,service_role;

create or replace function private.admin_list_reports(p_status text default 'PENDING',p_limit integer default 50)
returns table(report_id uuid,reporter_id uuid,reporter_name text,target_user_id uuid,target_name text,target_post_id uuid,post_body text,reason text,details text,status text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode='42501'; end if;
  return query select r.id,r.reporter_id,reporter.display_name,r.target_user_id,
    coalesce(target.display_name,post_author.display_name),r.target_post_id,left(p.body,280),
    r.reason,r.details,r.status,r.created_at
  from public.reports r
  left join public.profiles reporter on reporter.id=r.reporter_id
  left join public.profiles target on target.id=r.target_user_id
  left join public.posts p on p.id=r.target_post_id
  left join public.profiles post_author on post_author.id=p.author_id
  where p_status='ALL' or r.status=p_status order by r.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),100));
end $$;
revoke all on function private.admin_list_reports(text,integer) from public,anon;
grant execute on function private.admin_list_reports(text,integer) to authenticated;
