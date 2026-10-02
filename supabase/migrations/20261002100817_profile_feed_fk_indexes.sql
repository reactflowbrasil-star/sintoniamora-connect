create index if not exists profiles_cover_path_idx
  on public.profiles(cover_path) where cover_path is not null;
create index if not exists post_media_owner_id_idx on public.post_media(owner_id);
drop index if exists public.posts_author_created_idx;
