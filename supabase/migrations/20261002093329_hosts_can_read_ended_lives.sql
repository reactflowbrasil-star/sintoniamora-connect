drop policy if exists "members see active unblocked lives" on public.live_sessions;
create policy "members see active unblocked lives" on public.live_sessions
  for select to authenticated
  using (
    (status = 'LIVE' and private.user_is_active((select auth.uid()))
      and not private.are_blocked(host_id, (select auth.uid())))
    or (host_id = (select auth.uid()) and status = 'ENDED')
  );
