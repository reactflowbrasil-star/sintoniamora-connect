-- Indexes the owner keys used during message and account cleanup.
create index if not exists message_media_owner_idx on public.message_media(owner_id);
create index if not exists message_reactions_user_idx on public.message_reactions(user_id);
create index if not exists conversation_clears_user_idx on public.conversation_clears(user_id);
