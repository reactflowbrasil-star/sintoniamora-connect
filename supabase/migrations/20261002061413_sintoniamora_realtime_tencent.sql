-- Realtime delivery and read receipts for private conversations.
alter table public.conversation_members
  add column if not exists last_read_at timestamptz;

drop policy if exists "members update own read marker" on public.conversation_members;
create policy "members update own read marker" on public.conversation_members
  for update to authenticated
  using (user_id = (select auth.uid()) and private.can_access_conversation(conversation_id, (select auth.uid())))
  with check (user_id = (select auth.uid()) and private.can_access_conversation(conversation_id, (select auth.uid())));
grant update(last_read_at) on public.conversation_members to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = (select auth.uid())
    and private.can_access_conversation(p_conversation_id, (select auth.uid()));
$$;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.unread_message_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select cm.conversation_id, count(m.id)::bigint
  from public.conversation_members cm
  left join public.messages m
    on m.conversation_id = cm.conversation_id
    and m.sender_id <> (select auth.uid())
    and m.created_at > coalesce(cm.last_read_at, cm.joined_at)
  where cm.user_id = (select auth.uid())
  group by cm.conversation_id;
$$;
revoke all on function public.unread_message_counts() from public, anon;
grant execute on function public.unread_message_counts() to authenticated;

-- Tencent TRTC carries WebRTC media; Supabase stores session metadata and live chat.
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  room_id bigint generated always as identity unique check (room_id between 1 and 4294967294),
  title text not null check (char_length(title) between 3 and 100),
  status text not null default 'LIVE' check (status in ('LIVE', 'ENDED')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now()
);
alter table public.live_sessions enable row level security;
alter table public.live_chat_messages enable row level security;
grant select, insert, update on public.live_sessions to authenticated;
grant select, insert on public.live_chat_messages to authenticated;

drop policy if exists "members see active unblocked lives" on public.live_sessions;
create policy "members see active unblocked lives" on public.live_sessions
  for select to authenticated
  using (status = 'LIVE' and not private.are_blocked(host_id, (select auth.uid())));
drop policy if exists "members start own live" on public.live_sessions;
create policy "members start own live" on public.live_sessions
  for insert to authenticated
  with check (host_id = (select auth.uid()) and status = 'LIVE');
drop policy if exists "hosts end own live" on public.live_sessions;
create policy "hosts end own live" on public.live_sessions
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()) and status = 'ENDED' and ended_at is not null);

drop policy if exists "members read active live chat" on public.live_chat_messages;
create policy "members read active live chat" on public.live_chat_messages
  for select to authenticated
  using (exists (
    select 1 from public.live_sessions ls
    where ls.id = session_id and ls.status = 'LIVE'
      and not private.are_blocked(ls.host_id, (select auth.uid()))
  ));
drop policy if exists "members write active live chat" on public.live_chat_messages;
create policy "members write active live chat" on public.live_chat_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (
    select 1 from public.live_sessions ls
    where ls.id = session_id and ls.status = 'LIVE'
      and not private.are_blocked(ls.host_id, (select auth.uid()))
  ));

create index if not exists live_sessions_status_created_idx
  on public.live_sessions(status, created_at desc);
create index if not exists live_chat_session_created_idx
  on public.live_chat_messages(session_id, created_at desc);

-- The tables are published only for authenticated Realtime subscribers; RLS
-- remains the row-level gate for each subscribed user.
do $$
declare target_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach target_table in array array[
      'public.posts', 'public.likes', 'public.comments', 'public.messages',
      'public.conversation_members', 'public.notifications',
      'public.live_sessions', 'public.live_chat_messages'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = split_part(target_table, '.', 1)
          and tablename = split_part(target_table, '.', 2)
      ) then
        execute format('alter publication supabase_realtime add table %s', target_table);
      end if;
    end loop;
  end if;
end;
$$;
