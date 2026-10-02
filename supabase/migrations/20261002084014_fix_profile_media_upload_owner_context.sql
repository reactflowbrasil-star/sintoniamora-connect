-- Storage API sets object ownership fields on the row, while auth.uid() may not
-- be populated in the storage.objects trigger execution context.
create or replace function public.guard_profile_media_upload()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  member_id uuid;
  file_ext text;
  mime text;
  feature text;
  plan_key text;
  media_limit integer;
  media_count integer;
  file_size bigint;
begin
  if new.bucket_id <> 'profile-media' then return new; end if;

  -- owner_id is assigned by Supabase Storage from the authenticated request.
  -- Keep owner as a fallback for older Storage object rows/API versions.
  member_id := coalesce(nullif(new.owner_id, '')::uuid, new.owner);
  if member_id is null or coalesce((storage.foldername(new.name))[1], '') <> member_id::text then
    raise exception 'Acesso negado.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(member_id::text, 0));
  file_ext := lower(storage.extension(new.name));
  mime := coalesce(new.metadata->>'mimetype', '');
  file_size := coalesce((new.metadata->>'size')::bigint, 0);

  if file_ext in ('jpg','jpeg','png','webp') and mime like 'image/%' then
    feature := 'max_profile_photos';
    if file_size > 15728640 then raise exception 'Foto acima de 15 MB.'; end if;
  elsif file_ext in ('mp4','webm') and mime like 'video/%' then
    feature := 'max_profile_videos';
    if file_size > 104857600 then raise exception 'Vídeo acima de 100 MB.'; end if;
  else
    raise exception 'Formato de mídia não permitido.';
  end if;

  if exists(
    select 1 from public.subscriptions
    where user_id = member_id and status = 'ACTIVE' and plan_id = 'premium'
  ) then
    plan_key := 'premium';
  else
    plan_key := 'free';
  end if;
  select feature_value into media_limit from public.plan_features
    where plan_id = plan_key and feature_key = feature;
  if media_limit is null then
    if feature = 'max_profile_photos' then media_limit := 5; else media_limit := 2; end if;
  end if;

  if feature = 'max_profile_photos' then
    select count(*) into media_count from storage.objects o
      where o.bucket_id = 'profile-media'
        and (storage.foldername(o.name))[1] = member_id::text
        and lower(storage.extension(o.name)) in ('jpg','jpeg','png','webp');
  else
    select count(*) into media_count from storage.objects o
      where o.bucket_id = 'profile-media'
        and (storage.foldername(o.name))[1] = member_id::text
        and lower(storage.extension(o.name)) in ('mp4','webm');
  end if;
  if media_count >= media_limit then
    raise exception 'Você atingiu o limite de mídia do seu plano.';
  end if;
  return new;
end;
$$;
