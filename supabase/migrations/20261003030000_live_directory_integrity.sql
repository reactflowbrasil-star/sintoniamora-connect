-- Live directory integrity.
--
-- A session row in public.live_sessions is created before the browser joins the
-- room, and it only flips to ENDED when the host explicitly ends the broadcast.
-- Any other exit — the host navigating away, closing the tab, or a failed join —
-- used to leave the row as LIVE forever, so the dashboard kept advertising
-- "Transmitindo agora" for rooms with nobody in them.
--
-- The client now closes its own session on every exit and reclaims leftovers,
-- but the server needs to answer the same question for sessions whose host is
-- someone else: is there really a host connected? The only trustworthy signal
-- is the host heartbeat in live_viewer_presence, refreshed every 15s and pruned
-- after 90s (see 20261003000000_live_experience.sql).

create or replace function public.live_active_sessions()
returns table (
  id uuid,
  host_id uuid,
  room_id bigint,
  title text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path=''
as $$
  select ls.id, ls.host_id, ls.room_id, ls.title, ls.status, ls.created_at
    from public.live_sessions ls
   where ls.status = 'LIVE'
     -- The host refreshed presence inside the heartbeat window. Without this
     -- row the session is an orphan and must not be shown as a live broadcast.
     and exists (
       select 1
         from public.live_viewer_presence vp
        where vp.session_id = ls.id
          and vp.user_id = ls.host_id
          and vp.seen_at > now() - interval '90 seconds'
     )
     -- Same block rule the other live policies apply.
     and not private.are_blocked(ls.host_id, (select auth.uid()));
$$;

revoke all on function public.live_active_sessions() from public, anon;
grant execute on function public.live_active_sessions() to authenticated;

comment on function public.live_active_sessions() is
  'Sessions LIVE whose host sent a presence heartbeat in the last 90 seconds. Excludes sessions whose host blocked, or was blocked by, the caller.';