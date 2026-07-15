-- ============================================================
-- Migration 004 — Segurança do plano Profissional
-- Execute depois de 003_account_type.sql.
-- ============================================================

-- Usada pelas policies para avaliar o plano uma única vez por statement.
create or replace function public.is_freelancer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_type = 'freelancer'
  );
$$;

revoke all on function public.is_freelancer() from public;
grant execute on function public.is_freelancer() to authenticated;

-- Impede que account_type seja alterado por um update comum no perfil.
-- A função controlada abaixo continua liberada enquanto o upgrade for gratuito.
create or replace function public.protect_account_type()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.account_type is distinct from old.account_type
    and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'account_type só pode ser alterado pelo fluxo de plano'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_account_type on public.profiles;
create trigger protect_account_type
  before update of account_type on public.profiles
  for each row execute function public.protect_account_type();

-- Ponto único para a troca gratuita atual. Quando o pagamento for integrado,
-- remova o grant de authenticated e faça a promoção somente pelo webhook.
create or replace function public.set_own_account_type(new_account_type text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_account_type text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  if new_account_type not in ('personal', 'freelancer') then
    raise exception 'Tipo de conta inválido' using errcode = '22023';
  end if;

  update public.profiles
  set account_type = new_account_type
  where id = auth.uid()
  returning account_type into changed_account_type;

  if changed_account_type is null then
    raise exception 'Perfil não encontrado' using errcode = 'P0002';
  end if;

  return changed_account_type;
end;
$$;

revoke all on function public.set_own_account_type(text) from public;
grant execute on function public.set_own_account_type(text) to authenticated;

-- O plano Pessoal não lê nem altera Clientes/Projetos. As linhas permanecem
-- armazenadas e tornam-se acessíveis novamente após a reativação.
drop policy if exists "Usuários veem apenas os próprios clientes" on public.clients;
drop policy if exists "Usuários criam apenas com o próprio user_id" on public.clients;
drop policy if exists "Usuários atualizam apenas os próprios clientes" on public.clients;
drop policy if exists "Usuários deletam apenas os próprios clientes" on public.clients;
drop policy if exists "Profissionais veem os próprios clientes" on public.clients;
drop policy if exists "Profissionais criam os próprios clientes" on public.clients;
drop policy if exists "Profissionais atualizam os próprios clientes" on public.clients;
drop policy if exists "Profissionais deletam os próprios clientes" on public.clients;

create policy "Profissionais veem os próprios clientes"
  on public.clients for select
  using ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais criam os próprios clientes"
  on public.clients for insert
  with check ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais atualizam os próprios clientes"
  on public.clients for update
  using ((select auth.uid()) = user_id and (select public.is_freelancer()))
  with check ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais deletam os próprios clientes"
  on public.clients for delete
  using ((select auth.uid()) = user_id and (select public.is_freelancer()));

drop policy if exists "Usuários veem apenas os próprios projetos" on public.projects;
drop policy if exists "Usuários criam apenas com o próprio user_id" on public.projects;
drop policy if exists "Usuários atualizam apenas os próprios projetos" on public.projects;
drop policy if exists "Usuários deletam apenas os próprios projetos" on public.projects;
drop policy if exists "Profissionais veem os próprios projetos" on public.projects;
drop policy if exists "Profissionais criam os próprios projetos" on public.projects;
drop policy if exists "Profissionais atualizam os próprios projetos" on public.projects;
drop policy if exists "Profissionais deletam os próprios projetos" on public.projects;

create policy "Profissionais veem os próprios projetos"
  on public.projects for select
  using ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais criam os próprios projetos"
  on public.projects for insert
  with check ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais atualizam os próprios projetos"
  on public.projects for update
  using ((select auth.uid()) = user_id and (select public.is_freelancer()))
  with check ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais deletam os próprios projetos"
  on public.projects for delete
  using ((select auth.uid()) = user_id and (select public.is_freelancer()));
