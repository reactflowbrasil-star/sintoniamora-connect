alter table public.profiles
  add column if not exists cover_position_x integer not null default 50
    check (cover_position_x between 0 and 100),
  add column if not exists cover_position_y integer not null default 50
    check (cover_position_y between 0 and 100);
