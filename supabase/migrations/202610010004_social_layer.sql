-- Social layer: posts, follows, blocks, reports, direct messages and notifications.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

insert into public.plan_features(plan_id,feature_key,feature_value) values
  ('free','advanced_filters',0),
  ('free','premium_features',0),
  ('premium','advanced_filters',1),
  ('premium','premium_features',1)
on conflict(plan_id,feature_key) do nothing;

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 1000),
  status text not null default 'PUBLISHED' check(status in ('PUBLISHED','HIDDEN','REMOVED')),
  created_at timestamptz not null default now()
);
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),
  check(follower_id <> following_id)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  target_post_id uuid references public.posts(id) on delete cascade,
  reason text not null check(char_length(reason) between 3 and 80),
  details text not null default '' check(char_length(details) <= 1000),
  status text not null default 'PENDING' check(status in ('PENDING','REVIEWING','RESOLVED','DISMISSED')),
  created_at timestamptz not null default now(),
  check ((target_user_id is not null)::int + (target_post_id is not null)::int = 1)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check(kind in ('follow','like','comment','message','platform')),
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.blocks enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create or replace function private.are_blocked(first_user uuid, second_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() in (first_user,second_user) and exists(select 1 from public.blocks b where
    (b.blocker_id=first_user and b.blocked_id=second_user) or
    (b.blocker_id=second_user and b.blocked_id=first_user))
$$;
revoke all on function private.are_blocked(uuid,uuid) from public, anon;
grant execute on function private.are_blocked(uuid,uuid) to authenticated;

create or replace function private.can_access_conversation(target_conversation uuid, member uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid()=member and exists(select 1 from public.conversation_members own
    where own.conversation_id=target_conversation and own.user_id=member)
  and not exists(select 1 from public.conversation_members other
    where other.conversation_id=target_conversation and private.are_blocked(other.user_id,member))
$$;
create or replace function private.can_add_conversation_member(target_conversation uuid, creator uuid, target_member uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid()=creator and target_member is not null and creator is not null
  and exists(select 1 from public.conversations c where c.id=target_conversation and c.created_by=creator)
  and (
    (target_member=creator and (select count(*) from public.conversation_members cm where cm.conversation_id=target_conversation)=0)
    or
    (target_member<>creator and (select count(*) from public.conversation_members cm where cm.conversation_id=target_conversation)=1
      and exists(select 1 from public.conversation_members own where own.conversation_id=target_conversation and own.user_id=creator))
  )
  and (target_member=creator or not private.are_blocked(creator,target_member))
$$;
revoke all on function private.can_access_conversation(uuid,uuid) from public,anon;
revoke all on function private.can_add_conversation_member(uuid,uuid,uuid) from public,anon;
grant execute on function private.can_access_conversation(uuid,uuid) to authenticated;
grant execute on function private.can_add_conversation_member(uuid,uuid,uuid) to authenticated;

create policy "members see relevant blocks" on public.blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy "members block others" on public.blocks for insert to authenticated with check(blocker_id=(select auth.uid()));
create policy "members unblock others" on public.blocks for delete to authenticated using(blocker_id=(select auth.uid()));

drop policy if exists "profiles visible to signed-in members" on public.profiles;
create policy "profiles visible to signed-in members" on public.profiles for select to authenticated
using(id=(select auth.uid()) or not private.are_blocked(id,(select auth.uid())));

create policy "members read visible posts" on public.posts for select to authenticated
using(status='PUBLISHED' and not private.are_blocked(author_id,(select auth.uid())));
create policy "members publish own posts" on public.posts for insert to authenticated with check(author_id=(select auth.uid()) and status='PUBLISHED');
create policy "members delete own posts" on public.posts for delete to authenticated using(author_id=(select auth.uid()));
create policy "members read likes on visible posts" on public.likes for select to authenticated
using(exists(select 1 from public.posts p where p.id=post_id));
create policy "members like visible posts" on public.likes for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
create policy "members remove own likes" on public.likes for delete to authenticated using(user_id=(select auth.uid()));
create policy "members read comments on visible posts" on public.comments for select to authenticated
using(exists(select 1 from public.posts p where p.id=post_id) and not private.are_blocked(user_id,(select auth.uid())));
create policy "members comment on visible posts" on public.comments for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
create policy "members remove own comments" on public.comments for delete to authenticated using(user_id=(select auth.uid()));
create policy "members read own follows" on public.follows for select to authenticated using(follower_id=(select auth.uid()));
create policy "members follow others" on public.follows for insert to authenticated
with check(follower_id=(select auth.uid()) and not private.are_blocked(follower_id,following_id));
create policy "members unfollow" on public.follows for delete to authenticated using(follower_id=(select auth.uid()));
create policy "members create reports" on public.reports for insert to authenticated
with check(reporter_id=(select auth.uid()) and status='PENDING' and target_user_id is distinct from (select auth.uid()));
create policy "members read own reports" on public.reports for select to authenticated using(reporter_id=(select auth.uid()));

create policy "conversation members read conversations" on public.conversations for select to authenticated
using(private.can_access_conversation(id,(select auth.uid())));
create policy "members create conversations" on public.conversations for insert to authenticated with check(created_by=(select auth.uid()));
create policy "members read participants in own conversations" on public.conversation_members for select to authenticated
using(private.can_access_conversation(conversation_id,(select auth.uid())));
create policy "conversation creator adds members" on public.conversation_members for insert to authenticated
with check(private.can_add_conversation_member(conversation_id,(select auth.uid()),user_id));
create policy "conversation members read messages" on public.messages for select to authenticated
using(private.can_access_conversation(conversation_id,(select auth.uid())));
create policy "members send messages" on public.messages for insert to authenticated
with check(sender_id=(select auth.uid()) and private.can_access_conversation(conversation_id,(select auth.uid())));
create policy "members read own notifications" on public.notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy "members mark own notifications read" on public.notifications for update to authenticated
using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));

grant select,insert,delete on public.blocks to authenticated;
grant select,insert,delete on public.posts,public.likes,public.comments,public.follows to authenticated;
grant select,insert on public.reports to authenticated;
grant select,insert on public.conversations,public.conversation_members to authenticated;
grant select,insert on public.messages to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

create or replace function public.guard_conversation_member_count() returns trigger language plpgsql security definer set search_path='' as $$
declare member_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.conversation_id::text,0));
  select count(*) into member_count from public.conversation_members where conversation_id=new.conversation_id;
  if member_count >= 2 then raise exception 'Esta conversa já possui dois participantes.'; end if;
  return new;
end;
$$;
revoke all on function public.guard_conversation_member_count() from public,anon,authenticated;
create trigger guard_conversation_member_count before insert on public.conversation_members for each row execute function public.guard_conversation_member_count();

create or replace function public.start_conversation(other_member uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare current_member uuid; conversation_id uuid;
begin
  current_member := auth.uid();
  if current_member is null or other_member is null or current_member=other_member then raise exception 'Participante inválido.'; end if;
  if not exists(select 1 from public.profiles where id=other_member) then raise exception 'Perfil não encontrado.'; end if;
  if private.are_blocked(current_member,other_member) then raise exception 'Não é possível iniciar esta conversa.'; end if;
  select mine.conversation_id into conversation_id from public.conversation_members mine
    join public.conversation_members theirs on theirs.conversation_id=mine.conversation_id
    where mine.user_id=current_member and theirs.user_id=other_member limit 1;
  if conversation_id is null then
    insert into public.conversations(created_by) values(current_member) returning id into conversation_id;
    insert into public.conversation_members(conversation_id,user_id) values(conversation_id,current_member);
    insert into public.conversation_members(conversation_id,user_id) values(conversation_id,other_member);
  end if;
  return conversation_id;
end;
$$;
revoke all on function public.start_conversation(uuid) from public,anon;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function public.create_social_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor uuid; kind_value text; target uuid; target_kind text;
begin
  if tg_table_name='follows' then
    actor:=new.follower_id; recipient:=new.following_id; kind_value:='follow'; target:=recipient; target_kind:='profile';
  elsif tg_table_name='likes' then
    actor:=new.user_id; target:=new.post_id; kind_value:='like'; target_kind:='post';
    select p.author_id into recipient from public.posts p where p.id=target;
  elsif tg_table_name='comments' then
    actor:=new.user_id; target:=new.post_id; kind_value:='comment'; target_kind:='post';
    select p.author_id into recipient from public.posts p where p.id=target;
  elsif tg_table_name='messages' then
    actor:=new.sender_id; target:=new.conversation_id; kind_value:='message'; target_kind:='conversation';
    select cm.user_id into recipient from public.conversation_members cm where cm.conversation_id=target and cm.user_id<>actor limit 1;
  end if;
  if recipient is not null and recipient<>actor then
    insert into public.notifications(recipient_id,actor_id,kind,target_type,target_id)
    values(recipient,actor,kind_value,target_kind,target);
  end if;
  return new;
end;
$$;
revoke all on function public.create_social_notification() from public,anon,authenticated;
create trigger notify_on_follow after insert on public.follows for each row execute function public.create_social_notification();
create trigger notify_on_like after insert on public.likes for each row execute function public.create_social_notification();
create trigger notify_on_comment after insert on public.comments for each row execute function public.create_social_notification();
create trigger notify_on_message after insert on public.messages for each row execute function public.create_social_notification();

create index if not exists posts_created_at_idx on public.posts(created_at desc) where status='PUBLISHED';
create index if not exists posts_author_idx on public.posts(author_id,created_at desc);
create index if not exists comments_post_created_idx on public.comments(post_id,created_at);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id,conversation_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index if not exists reports_status_created_idx on public.reports(status,created_at);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id,created_at desc);
create index if not exists likes_user_created_idx on public.likes(user_id,created_at desc);
create index if not exists comments_user_created_idx on public.comments(user_id,created_at desc);
create index if not exists reports_reporter_created_idx on public.reports(reporter_id,created_at desc);
create index if not exists reports_target_user_idx on public.reports(target_user_id) where target_user_id is not null;
create index if not exists reports_target_post_idx on public.reports(target_post_id) where target_post_id is not null;
create index if not exists conversations_creator_created_idx on public.conversations(created_by,created_at desc);
create index if not exists messages_sender_created_idx on public.messages(sender_id,created_at desc);
create index if not exists notifications_actor_created_idx on public.notifications(actor_id,created_at desc);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index if not exists profiles_avatar_path_idx on public.profiles(avatar_path) where avatar_path is not null;
