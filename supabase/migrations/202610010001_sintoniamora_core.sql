-- Sintoniamora auth, profiles and profile media
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  bio text not null default '' check (char_length(bio) <= 500),
  city text not null default '' check (char_length(city) <= 80),
  state text not null default '' check (char_length(state) <= 2),
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  created_at timestamptz not null default now(),
  constraint adult_only check (birth_date <= (current_date - interval '18 years')::date)
);
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  active boolean not null default true
);
insert into public.subscription_plans(id,name,price_cents) values ('free','Sintoniamora Free',0),('premium','Sintoniamora Premium',4990) on conflict (id) do nothing;
create table if not exists public.plan_features (
  plan_id text not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null,
  feature_value integer not null check (feature_value >= 0),
  primary key(plan_id,feature_key)
);
insert into public.plan_features(plan_id,feature_key,feature_value) values ('free','max_profile_photos',5),('free','max_profile_videos',2),('premium','max_profile_photos',30),('premium','max_profile_videos',10) on conflict (plan_id,feature_key) do nothing;
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null check(status in ('PENDING','ACTIVE','PAST_DUE','CANCELED','EXPIRED','REFUNDED')),
  created_at timestamptz not null default now()
);
create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now()
);
create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  media_type text not null check(media_type in ('photo','video')),
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;
alter table public.profile_media enable row level security;
alter table public.terms_acceptances enable row level security;
grant select,insert,update on public.profiles to authenticated;
grant select on public.private_profiles, public.subscriptions, public.profile_media to authenticated;
grant select on public.subscription_plans, public.plan_features to anon, authenticated;
create policy "profiles visible to signed-in members" on public.profiles for select to authenticated using (true);
create policy "members create own profile" on public.profiles for insert to authenticated with check(id=auth.uid());
create policy "members update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "private profile is self only" on public.private_profiles for select to authenticated using(user_id=auth.uid());
create policy "plans readable" on public.subscription_plans for select to anon,authenticated using(active);
create policy "features readable" on public.plan_features for select to anon,authenticated using(true);
create policy "members read own subscription" on public.subscriptions for select to authenticated using(user_id=auth.uid());
create policy "members read own media" on public.profile_media for select to authenticated using(user_id=auth.uid());
create policy "members add own media metadata" on public.profile_media for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from storage.objects o where o.bucket_id='profile-media' and o.name=object_path));
create policy "members remove own media metadata" on public.profile_media for delete to authenticated using(user_id=auth.uid());
create or replace function public.create_sintoniamora_member() returns trigger language plpgsql security definer set search_path=public as $$
declare bd date;
begin
  if coalesce(new.raw_user_meta_data->>'terms_accepted','false') <> 'true' then raise exception 'É necessário aceitar os termos.'; end if;
  begin bd := (new.raw_user_meta_data->>'birth_date')::date; exception when others then raise exception 'Data de nascimento inválida.'; end;
  if bd > (current_date - interval '18 years')::date then raise exception 'A plataforma é exclusiva para maiores de 18 anos.'; end if;
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into public.private_profiles(user_id,full_name,birth_date) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),bd);
  insert into public.terms_acceptances(user_id,terms_version) values(new.id,'2026-10-01');
  return new;
end $$;
drop trigger if exists on_auth_user_created_sintoniamora on auth.users;
create trigger on_auth_user_created_sintoniamora after insert on auth.users for each row execute function public.create_sintoniamora_member();
create or replace function public.guard_profile_media_upload() returns trigger language plpgsql security definer set search_path=public,storage as $$
declare uid uuid; ext text; mt text; lim integer; used integer; feature text;
begin
  if new.bucket_id <> 'profile-media' then return new; end if;
  uid := auth.uid();
  if uid is null or (storage.foldername(new.name))[1] <> uid::text then raise exception 'Acesso negado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  ext := lower(storage.extension(new.name)); mt := coalesce(new.metadata->>'mimetype','');
  if ext in ('jpg','jpeg','png','webp') and mt like 'image/%' then feature := 'max_profile_photos';
  elsif ext in ('mp4','webm') and mt like 'video/%' then feature := 'max_profile_videos';
  else raise exception 'Formato de mídia não permitido.'; end if;
  if coalesce((new.metadata->>'size')::bigint,0) > case when feature='max_profile_photos' then 15728640 else 104857600 end then raise exception 'Arquivo acima do tamanho permitido.'; end if;
  select coalesce(pf.feature_value,case when feature='max_profile_photos' then 5 else 2 end) into lim
    from public.plan_features pf where pf.plan_id = case when exists(select 1 from public.subscriptions s where s.user_id=uid and s.status='ACTIVE' and s.plan_id='premium') then 'premium' else 'free' end and pf.feature_key=feature;
  lim := coalesce(lim,case when feature='max_profile_photos' then 5 else 2 end);
  select count(*) into used from storage.objects o where o.bucket_id='profile-media' and (storage.foldername(o.name))[1]=uid::text and ((feature='max_profile_photos' and lower(storage.extension(o.name)) in ('jpg','jpeg','png','webp')) or (feature='max_profile_videos' and lower(storage.extension(o.name)) in ('mp4','webm')));
  if used >= lim then raise exception 'Você atingiu o limite de mídia do seu plano.'; end if;
  return new;
end $$;
drop trigger if exists guard_sintoniamora_profile_media on storage.objects;
create trigger guard_sintoniamora_profile_media before insert on storage.objects for each row execute function public.guard_profile_media_upload();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-media','profile-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do update set public=false;
create policy "member uploads own profile media" on storage.objects for insert to authenticated with check(bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "members read own profile media" on storage.objects for select to authenticated using(bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "members delete own profile media" on storage.objects for delete to authenticated using(bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);
create or replace function public.register_profile_media(p_object_path text,p_media_type text,p_mime_type text,p_size_bytes bigint) returns public.profile_media language plpgsql security invoker set search_path=public,storage as $$
declare result public.profile_media;
begin
  if not exists(select 1 from storage.objects where bucket_id='profile-media' and name=p_object_path) then raise exception 'Upload não encontrado.'; end if;
  insert into public.profile_media(user_id,object_path,media_type,mime_type,size_bytes) values(auth.uid(),p_object_path,p_media_type,p_mime_type,p_size_bytes) returning * into result;
  return result;
end $$;
grant execute on function public.register_profile_media(text,text,text,bigint) to authenticated;
