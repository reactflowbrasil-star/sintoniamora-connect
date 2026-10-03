-- Login social com Google.
--
-- O gatilho original exigia `birth_date` e `terms_accepted` em
-- raw_user_meta_data, campos que o Google nunca envia. Sem mudar isso, qualquer
-- cadastro via Google quebraria no after insert de auth.users.
--
-- A regra 18+ continua valendo: o membro criado pelo Google fica SEM registro
-- em private_profiles até confirmar data de nascimento e termos na tela de
-- conclusão. O check do banco segue sendo a última linha de defesa.

create or replace function public.create_sintoniamora_member() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  bd date;
  has_birth boolean := coalesce(new.raw_user_meta_data->>'birth_date','') <> '';
begin
  if has_birth then
    if coalesce(new.raw_user_meta_data->>'terms_accepted','false') <> 'true' then
      raise exception 'É necessário aceitar os termos.';
    end if;
    begin
      bd := (new.raw_user_meta_data->>'birth_date')::date;
    exception when others then
      raise exception 'Data de nascimento inválida.';
    end;
    if bd > (current_date - interval '18 years')::date then
      raise exception 'A plataforma é exclusiva para maiores de 18 anos.';
    end if;
  end if;

  insert into public.profiles(id,display_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do update set display_name = excluded.display_name;

  -- Sem data de nascimento (Google) o membro fica pendente: private_profiles é
  -- preenchida depois por complete_member_registration.
  if has_birth then
    insert into public.private_profiles(user_id,full_name,birth_date)
    values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), bd)
    on conflict (user_id) do update
      set full_name = excluded.full_name, birth_date = excluded.birth_date;
    insert into public.terms_acceptances(user_id,terms_version)
    select new.id, '2026-10-01'
    where not exists (select 1 from public.terms_acceptances ta where ta.user_id = new.id);
  end if;
  return new;
end;
$$;

-- Preenche o que o Google não fornece: data de nascimento, nome civil e aceite.
-- Idempotente: pode ser chamada de novo sem duplicar registro.
create or replace function public.complete_member_registration(
  birth_date date,
  full_name text,
  display_name text
) returns void
language plpgsql security definer set search_path=public as $$
declare
  member uuid := auth.uid();
begin
  if member is null then
    raise exception 'Entre na sua conta para continuar.';
  end if;
  if birth_date is null then
    raise exception 'Informe uma data de nascimento válida.';
  end if;
  if birth_date > (current_date - interval '18 years')::date then
    raise exception 'A plataforma é exclusiva para maiores de 18 anos.';
  end if;
  if coalesce(btrim(full_name),'') = '' then
    raise exception 'Informe seu nome completo.';
  end if;

  insert into public.profiles(id,display_name)
  values(member, left(coalesce(nullif(btrim(display_name),''), btrim(full_name)), 40))
  on conflict (id) do update
    set display_name = coalesce(nullif(btrim(display_name),''), public.profiles.display_name);

  insert into public.private_profiles(user_id,full_name,birth_date)
  values(member, btrim(full_name), birth_date)
  on conflict (user_id) do update
    set full_name = excluded.full_name, birth_date = excluded.birth_date;

  insert into public.terms_acceptances(user_id,terms_version)
  select member, '2026-10-01'
  where not exists (select 1 from public.terms_acceptances ta where ta.user_id = member);
end;
$$;

grant execute on function public.complete_member_registration(date, text, text) to authenticated;