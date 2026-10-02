create table if not exists public.live_gifts (
  id text primary key,
  name text not null,
  emoji text not null,
  points integer not null check (points > 0),
  active boolean not null default true
);
insert into public.live_gifts(id,name,emoji,points) values
  ('heart','Coração','💖',5),
  ('rose','Rosa','🌹',10),
  ('star','Estrela','⭐',20),
  ('crown','Coroa','👑',50)
on conflict (id) do update set name=excluded.name,emoji=excluded.emoji,points=excluded.points,active=true;

create table if not exists public.live_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('TAP','GIFT')),
  gift_id text references public.live_gifts(id),
  quantity integer not null default 1 check (quantity between 1 and 5),
  created_at timestamptz not null default now(),
  constraint live_interaction_shape check (
    (kind='TAP' and gift_id is null and quantity=1)
    or (kind='GIFT' and gift_id is not null)
  )
);
create table if not exists public.live_reward_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points bigint not null default 0 check(total_points >= 0),
  updated_at timestamptz not null default now()
);
alter table public.live_gifts enable row level security;
alter table public.live_interactions enable row level security;
alter table public.live_reward_balances enable row level security;
grant select on public.live_gifts to authenticated;
grant select,insert on public.live_interactions to authenticated;
grant select on public.live_reward_balances to authenticated;
drop policy if exists "members read active live gifts" on public.live_gifts;
create policy "members read active live gifts" on public.live_gifts
  for select to authenticated using(active and private.user_is_active((select auth.uid())));
drop policy if exists "members read live interactions" on public.live_interactions;
create policy "members read live interactions" on public.live_interactions
  for select to authenticated using (
    private.user_is_active((select auth.uid()))
    and exists (
      select 1 from public.live_sessions ls
      where ls.id=session_id and ls.status='LIVE'
        and (ls.host_id=(select auth.uid()) or not private.are_blocked(ls.host_id,(select auth.uid())))
    )
  );
drop policy if exists "members send live interactions" on public.live_interactions;
create policy "members send live interactions" on public.live_interactions
  for insert to authenticated with check (
    sender_id=(select auth.uid())
    and private.user_is_active((select auth.uid()))
    and exists (
      select 1 from public.live_sessions ls
      where ls.id=session_id and ls.status='LIVE' and ls.host_id<> (select auth.uid())
        and not private.are_blocked(ls.host_id,(select auth.uid()))
    )
    and (
      (kind='TAP' and gift_id is null and quantity=1)
      or (kind='GIFT' and gift_id is not null and exists (
        select 1 from public.live_gifts g where g.id=gift_id and g.active
      ))
    )
  );
drop policy if exists "members read own live rewards" on public.live_reward_balances;
create policy "members read own live rewards" on public.live_reward_balances
  for select to authenticated using(user_id=(select auth.uid()));

create or replace function private.guard_live_tap_rate()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.kind='TAP' and exists (
    select 1 from public.live_interactions i
    where i.session_id=new.session_id and i.sender_id=new.sender_id
      and i.kind='TAP' and i.created_at > now()-interval '250 milliseconds'
  ) then
    raise exception 'Aguarde um instante antes de enviar mais reações.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_live_tap_rate() from public,anon,authenticated;
drop trigger if exists guard_live_tap_rate on public.live_interactions;
create trigger guard_live_tap_rate before insert on public.live_interactions
  for each row execute function private.guard_live_tap_rate();

create or replace function private.credit_live_host_rewards()
returns trigger language plpgsql security definer set search_path=''
as $$
declare host_user uuid; gift_points integer;
begin
  if new.kind <> 'GIFT' then return new; end if;
  select ls.host_id, g.points into host_user, gift_points
  from public.live_sessions ls join public.live_gifts g on g.id=new.gift_id and g.active
  where ls.id=new.session_id and ls.status='LIVE';
  if host_user is null then raise exception 'A transmissão foi encerrada ou o presente não está disponível.'; end if;
  insert into public.live_reward_balances(user_id,total_points,updated_at)
  values(host_user,gift_points*new.quantity,now())
  on conflict(user_id) do update set total_points=public.live_reward_balances.total_points+excluded.total_points,updated_at=now();
  return new;
end;
$$;
revoke all on function private.credit_live_host_rewards() from public,anon,authenticated;
drop trigger if exists credit_live_host_rewards on public.live_interactions;
create trigger credit_live_host_rewards after insert on public.live_interactions
  for each row execute function private.credit_live_host_rewards();

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_interactions') then
    alter publication supabase_realtime add table public.live_interactions;
  end if;
end;
$$;
