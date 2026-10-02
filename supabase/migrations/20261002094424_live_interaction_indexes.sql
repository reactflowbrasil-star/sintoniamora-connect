create index if not exists live_sessions_host_id_idx on public.live_sessions(host_id);
create index if not exists live_chat_messages_sender_id_idx on public.live_chat_messages(sender_id);
create index if not exists live_interactions_session_created_idx on public.live_interactions(session_id,created_at desc);
create index if not exists live_interactions_sender_created_idx on public.live_interactions(sender_id,created_at desc);
create index if not exists live_interactions_gift_id_idx on public.live_interactions(gift_id) where gift_id is not null;
