create or replace function private.start_conversation(other_member uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_member uuid:=(select auth.uid()); created_conversation_id uuid;
begin
 if current_member is null or other_member is null or current_member=other_member then raise exception 'Participante inválido.' using errcode='22023'; end if;
 if not private.user_is_active(current_member) or exists(select 1 from private.user_access a where a.user_id=other_member and a.status='suspended') then
   raise exception 'Uma das contas não pode usar o bate-papo.' using errcode='42501';
 end if;
 if not exists(select 1 from public.profiles where id=other_member) then raise exception 'Perfil não encontrado.'; end if;
 if private.are_blocked(current_member,other_member) then raise exception 'Não é possível iniciar esta conversa.' using errcode='42501'; end if;
 select mine.conversation_id into created_conversation_id from public.conversation_members mine
 join public.conversation_members theirs on theirs.conversation_id=mine.conversation_id
 where mine.user_id=current_member and theirs.user_id=other_member limit 1;
 if created_conversation_id is null then
   insert into public.conversations(created_by) values(current_member) returning id into created_conversation_id;
   insert into public.conversation_members(conversation_id,user_id) values(created_conversation_id,current_member);
   insert into public.conversation_members(conversation_id,user_id) values(created_conversation_id,other_member);
 end if;
 return created_conversation_id;
end $$;
revoke all on function private.start_conversation(uuid) from public,anon;
grant execute on function private.start_conversation(uuid) to authenticated;
