-- ============================================================
-- OrganizaFlow — 002: Criar usuário padrão
-- Execute no Supabase SQL Editor.
--
-- Cria um novo usuário comum (igual a um cadastro normal pelo app).
-- O profile é criado automaticamente pela trigger on_auth_user_created,
-- e o RLS padrão já limita o usuário aos próprios dados.
--
-- >>> ANTES DE EXECUTAR: altere as 3 variáveis abaixo (email, senha, nome).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_email     text := 'usuario@exemplo.com';       -- <<< ALTERE: e-mail do usuário
  v_password  text := 'TroqueEstaSenha123!';        -- <<< ALTERE: senha (mín. 8 caracteres)
  v_full_name text := 'Novo Usuário';               -- <<< ALTERE: nome exibido
  v_user_id   uuid;
begin
  -- Não recria se o e-mail já existir.
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is not null then
    raise notice 'Usuário já existe: % (id=%)', v_email, v_user_id;
    return;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name),
    '', '', '', ''
  );

  -- Identidade de e-mail correspondente (necessária para o login por senha).
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  raise notice 'Usuário criado: % (id=%)', v_email, v_user_id;
end $$;
