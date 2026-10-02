alter table public.profiles
  add constraint profiles_cover_path_fkey
  foreign key (cover_path) references public.profile_media(object_path) on delete set null;
