alter table public.posts
  add column if not exists audience text not null default 'PUBLIC'
  check (audience in ('PUBLIC','FOLLOWERS'));

drop policy if exists "members read visible posts" on public.posts;
create policy "members read audience posts" on public.posts
  for select to authenticated
  using (
    status='PUBLISHED'
    and private.user_is_active((select auth.uid()))
    and not private.are_blocked(author_id,(select auth.uid()))
    and (
      audience='PUBLIC'
      or author_id=(select auth.uid())
      or exists (
        select 1 from public.follows f
        where f.follower_id=(select auth.uid()) and f.following_id=posts.author_id
      )
    )
  );

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  media_type text not null check(media_type in ('photo','video')),
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0),
  created_at timestamptz not null default now()
);
alter table public.post_media enable row level security;
grant select,insert,delete on public.post_media to authenticated;
drop policy if exists "members read media on visible posts" on public.post_media;
create policy "members read media on visible posts" on public.post_media
  for select to authenticated using (
    private.user_is_active((select auth.uid()))
    and exists (
      select 1 from public.posts p where p.id=post_id and p.status='PUBLISHED'
        and not private.are_blocked(p.author_id,(select auth.uid()))
        and (p.audience='PUBLIC' or p.author_id=(select auth.uid()) or exists (
          select 1 from public.follows f
          where f.follower_id=(select auth.uid()) and f.following_id=p.author_id
        ))
    )
  );
drop policy if exists "members attach media to own posts" on public.post_media;
create policy "members attach media to own posts" on public.post_media
  for insert to authenticated with check (
    owner_id=(select auth.uid())
    and private.user_is_active((select auth.uid()))
    and exists(select 1 from public.posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.status='PUBLISHED')
  );
drop policy if exists "members remove media from own posts" on public.post_media;
create policy "members remove media from own posts" on public.post_media
  for delete to authenticated using(owner_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('post-media','post-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "members upload own post media" on storage.objects;
create policy "members upload own post media" on storage.objects
  for insert to authenticated with check(
    bucket_id='post-media'
    and (storage.foldername(name))[1]=((select auth.uid()))::text
    and private.user_is_active((select auth.uid()))
  );
drop policy if exists "members read visible post media files" on storage.objects;
create policy "members read visible post media files" on storage.objects
  for select to authenticated using(
    bucket_id='post-media'
    and exists(select 1 from public.post_media pm where pm.object_path=storage.objects.name)
  );
drop policy if exists "members delete own post media files" on storage.objects;
create policy "members delete own post media files" on storage.objects
  for delete to authenticated using(
    bucket_id='post-media'
    and (storage.foldername(name))[1]=((select auth.uid()))::text
  );

create index if not exists post_media_post_created_idx on public.post_media(post_id,created_at);
