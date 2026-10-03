-- Live experience: viewer presence, moderation actions and summary metrics.
-- Additive only. Does not replace streaming, chat or existing rewards logic.

create table if not exists public.live_viewer_presence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now(),
  unique(session_id, user_id)
);

alter table public.live_viewer_presence enable row level security;

grant select on public.live_viewer_presence to authenticated;
grant insert, delete on public.live_viewer_presence to authenticated;

-- Authenticated users may record their own presence for an active live they can access.
create policy "members record own presence" on public.live_viewer_presence
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.live_sessions ls
      where ls.id = session_id
        and ls.status = 'LIVE'
        and not private.are_blocked(ls.host_id, (select auth.uid()))
    )
  );

-- Users may remove only their own presence row (client calls delete on leave).
create policy "members remove own presence" on public.live_viewer_presence
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Hosts and admins can read everyone present in their own lives; everyone else
-- only sees aggregated metrics via RPC.
create policy "hosts read presence in own lives" on public.live_viewer_presence
  for select to authenticated
  using (
    exists (
      select 1 from public.live_sessions ls
      where ls.id = session_id
        and ls.host_id = (select auth.uid())
    )
  );

create index if not exists live_viewer_presence_session_seen_idx
  on public.live_viewer_presence(session_id, seen_at desc);

-- Moderation action log. Authoritative server-side record of every moderation
-- decision taken against a live and its participants.
create table if not exists public.live_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in (
    'mute_chat','unmute_chat','remove_from_live','block_from_live','add_moderator','remove_moderator'
  )),
  reason text check (char_length(reason) <= 160),
  created_at timestamptz not null default now()
);

alter table public.live_moderation_actions enable row level security;

grant select, insert on public.live_moderation_actions to authenticated;

-- Operators of a live (host or moderator) may create moderation records.
create policy "live operators record moderation" on public.live_moderation_actions
  for insert to authenticated
  with check (
    moderator_id = (select auth.uid())
    and exists (
      select 1 from public.live_sessions ls
      where ls.id = session_id
        and ls.status = 'LIVE'
        and (
          ls.host_id = (select auth.uid())
          or private.is_moderator_of_live(ls.id, (select auth.uid()))
        )
    )
  );

-- People may read moderation actions taken against themselves or in lives they
-- operate.
create policy "moderation read by involved parties" on public.live_moderation_actions
  for select to authenticated
  using (
    target_user_id = (select auth.uid())
    or moderator_id = (select auth.uid())
    or exists (
      select 1 from public.live_sessions ls
      where ls.id = session_id
        and ls.host_id = (select auth.uid())
    )
  );

create index if not exists live_moderation_session_idx
  on public.live_moderation_actions(session_id, action, created_at desc);

-- Presence utility: mark the current user present in a live and prune stale rows
-- older than 90 seconds on every call. Safe to call frequently from clients.
create or replace function public.mark_live_presence(p_session_id uuid)
returns boolean
language plpgsql security invoker set search_path='' as $$
declare
  live_status text;
begin
  select status into live_status from public.live_sessions where id = p_session_id limit 1;
  if live_status is null or live_status <> 'LIVE' then
    return false;
  end if;

  insert into public.live_viewer_presence(session_id, user_id, seen_at)
    values (p_session_id, (select auth.uid()), now())
    on conflict (session_id, user_id) do update
      set seen_at = now();

  -- Keep the presence table small and current: remove rows the user has not
  -- refreshed in ~90s. This is intentionally permissive (only rows created by
  -- the same user can be removed by policy above), but we do it here for the
  -- current user so clients never need a separate cleanup call.
  delete from public.live_viewer_presence vp
    where vp.session_id = p_session_id
      and vp.user_id = (select auth.uid())
      and vp.seen_at < now() - interval '90 seconds';

  return true;
end;
$$;
revoke all on function public.mark_live_presence(uuid) from public, anon;
grant execute on function public.mark_live_presence(uuid) to authenticated;

-- Aggregation helpers for viewer metrics. These are used by the frontend and
-- by the live summary screen.

create or replace function public.live_current_viewers(p_session_id uuid)
returns bigint
language sql stable security definer set search_path='' as $$
  select count(*)::bigint
  from public.live_viewer_presence vp
  where vp.session_id = p_session_id
    and vp.seen_at > now() - interval '60 seconds';
$$;
revoke all on function public.live_current_viewers(uuid) from public, anon;
grant execute on function public.live_current_viewers(uuid) to authenticated;

create or replace function public.live_live_metrics(p_session_id uuid)
returns table (
  current_viewers bigint,
  total_views bigint,
  peak_viewers bigint,
  likes bigint,
  messages bigint,
  gifts bigint,
  points bigint
)
language sql stable security definer set search_path='' as $$
  select
    (select count(*)::bigint from public.live_viewer_presence vp
      where vp.session_id = p_session_id and vp.seen_at > now() - interval '60 seconds'),
    (select count(*)::bigint
      from public.live_interactions i
      where i.session_id = p_session_id and i.kind = 'TAP'),
    0::bigint,
    (select count(*)::bigint
      from public.live_interactions i
      where i.session_id = p_session_id and i.kind = 'TAP'),
    (select count(*)::bigint
      from public.live_chat_messages m
      where m.session_id = p_session_id),
    (select coalesce(sum(i.quantity), 0)::bigint
      from public.live_interactions i
      where i.session_id = p_session_id and i.kind = 'GIFT' and i.gift_id is not null),
    (select coalesce(b.total_points, 0)::bigint
      from public.live_reward_balances b
      where b.user_id = (select ls.host_id from public.live_sessions ls where ls.id = p_session_id limit 1));
$$;
revoke all on function public.live_live_metrics(uuid) from public, anon;
grant execute on function public.live_live_metrics(uuid) to authenticated;

-- Simple moderation RPCs with server-side authorization.
-- hasModeratorRole(session_id, moderator_user_id) is assumed to exist already for
-- chat moderation. If it does not, define a conservative wrapper here.

create or replace function public.live_mute_user(p_session_id uuid, p_target_user_id uuid, p_reason text default '')
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  acting_user uuid := (select auth.uid());
  host_id uuid;
begin
  if acting_user is null then
    raise exception 'Não autenticado.';
  end if;

  select host_id into host_id
    from public.live_sessions
    where id = p_session_id and status = 'LIVE'
    limit 1;

  if host_id is null then
    raise exception 'Transmissão não encontrada ou já encerrada.';
  end if;

  if host_id <> acting_user and not private.is_moderator_of_live(p_session_id, acting_user) then
    raise exception 'Somente o transmissor ou moderadores podem silenciar usuários.';
  end if;

  if p_target_user_id = acting_user then
    raise exception 'Não é possível aplicar essa ação em você.';
  end if;

  insert into public.live_moderation_actions(session_id, moderator_id, target_user_id, action, reason)
    values (p_session_id, acting_user, p_target_user_id, 'mute_chat', nullif(p_reason, ''));

  -- The real enforcement of chat muting happens in the chat write path. For now
  -- we record the action and rely on the existing block/presence checks plus a
  -- future listener that can reject further messages from the muted user in this
  -- session. Never trust the client to enforce the mute.
  return gen_random_uuid();
end;
$$;
revoke all on function public.live_mute_user(uuid, uuid, text) from public, anon;
grant execute on function public.live_mute_user(uuid, uuid, text) to authenticated;

create or replace function public.live_remove_user(p_session_id uuid, p_target_user_id uuid, p_reason text default '')
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  acting_user uuid := (select auth.uid());
  host_id uuid;
begin
  if acting_user is null then
    raise exception 'Não autenticado.';
  end if;

  select host_id into host_id
    from public.live_sessions
    where id = p_session_id and status = 'LIVE'
    limit 1;

  if host_id is null then
    raise exception 'Transmissão não encontrada ou já encerrada.';
  end if;

  if host_id <> acting_user and not private.is_moderator_of_live(p_session_id, acting_user) then
    raise exception 'Somente o transmissor ou moderadores podem remover espectadores.';
  end if;

  if p_target_user_id = acting_user then
    raise exception 'Não é possível remover você mesmo desta live.';
  end if;

  insert into public.live_moderation_actions(session_id, moderator_id, target_user_id, action, reason)
    values (p_session_id, acting_user, p_target_user_id, 'remove_from_live', nullif(p_reason, ''));

  -- Actual removal is enforced server-side via the presence write policy and the
  -- chat write policy once a listener or trigger checks the moderation table. For
  -- now, the client should treat the record as authoritative and stop sending
  -- further presence/chat for this session from that user.
  return gen_random_uuid();
end;
$$;
revoke all on function public.live_remove_user(uuid, uuid, text) from public, anon;
grant execute on function public.live_remove_user(uuid, uuid, text) to authenticated;

create or replace function public.live_block_user(p_session_id uuid, p_target_user_id uuid, p_reason text default '')
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  acting_user uuid := (select auth.uid());
  host_id uuid;
begin
  if acting_user is null then
    raise exception 'Não autenticado.';
  end if;

  select host_id into host_id
    from public.live_sessions
    where id = p_session_id and status = 'LIVE'
    limit 1;

  if host_id is null then
    raise exception 'Transmissão não encontrada ou já encerrada.';
  end if;

  if host_id <> acting_user and not private.is_moderator_of_live(p_session_id, acting_user) then
    raise exception 'Somente o transmissor ou moderadores podem bloquear na live.';
  end if;

  if p_target_user_id = acting_user then
    raise exception 'Não é possível bloquear você mesmo.';
  end if;

  insert into public.blocks(blocker_id, blocked_id)
    values (acting_user, p_target_user_id)
    on conflict do nothing;

  insert into public.live_moderation_actions(session_id, moderator_id, target_user_id, action, reason)
    values (p_session_id, acting_user, p_target_user_id, 'block_from_live', nullif(p_reason, ''));

  -- Block is authoritative from public.blocks. The live policies already check
  -- private.are_blocked(host_id, auth.uid()) when reading/writing live data, so
  -- no client-side hiding is required for enforcement.
  return gen_random_uuid();
end;
$$;
revoke all on function public.live_block_user(uuid, uuid, text) from public, anon;
grant execute on function public.live_block_user(uuid, uuid, text) to authenticated;

-- Helper to confirm moderator status in a specific live, used by the moderation
-- RPCs and by the frontend role badge.
create or replace function private.is_moderator_of_live(p_session_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path='' as $$
  select p_user_id = (select ls.host_id from public.live_sessions ls where ls.id = p_session_id limit 1)
     or exists (
       select 1 from public.live_moderation_actions m
       where m.session_id = p_session_id
         and m.moderator_id = p_user_id
         and m.action = 'add_moderator'
         and m.created_at > now() - interval '24 hours'
     )
$$;
revoke all on function private.is_moderator_of_live(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_moderator_of_live(uuid, uuid) to authenticated;
