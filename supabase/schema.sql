-- ============================================================
-- OrganizaFlow — Schema completo com RLS
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfis dos usuários (espelha auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  account_type text not null default 'personal'
    check (account_type in ('personal', 'freelancer')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Clientes
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  company text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Projetos
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'planning'
    check (status in ('planning', 'in_progress', 'waiting_client', 'completed', 'paused')),
  deadline date,
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Tarefas
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_date date,
  due_time time,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Lançamentos financeiros
create table public.financial_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  title text not null,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'received', 'overdue')),
  due_date date not null,
  paid_at date,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  series_id uuid,
  series_type text check (series_type in ('installment', 'recurring')),
  series_number integer,
  series_count integer,
  constraint financial_entries_series_consistency check (
    (
      series_id is null
      and series_type is null
      and series_number is null
      and series_count is null
    )
    or
    (
      series_id is not null
      and series_type in ('installment', 'recurring')
      and series_number between 1 and 60
      and series_count between 2 and 60
      and series_number <= series_count
    )
  ),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Categorias financeiras personalizadas
create table public.financial_categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz default now() not null
);

-- Notas rápidas
create table public.quick_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  is_pinned boolean default false not null,
  tags text[] default '{}'::text[] not null,
  note_color text not null default 'default'
    check (note_color in ('default', 'yellow', 'blue', 'green', 'rose', 'purple')),
  is_archived boolean default false not null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.clients
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.projects
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.financial_entries
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.quick_notes
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- TRIGGER — criar perfil automático ao registrar
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNÇÕES — controle do plano
-- ============================================================

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

create trigger protect_account_type
  before update of account_type on public.profiles
  for each row execute function public.protect_account_type();

-- Troca gratuita temporária. No fluxo pago, a promoção deve ser feita pelo
-- webhook e o grant de authenticated abaixo deve ser removido.
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.financial_entries enable row level security;
alter table public.financial_categories enable row level security;
alter table public.quick_notes enable row level security;

-- ---- PROFILES ----
create policy "Usuários podem ver apenas o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar apenas o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- CLIENTS (plano Profissional) ----
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

-- ---- PROJECTS (plano Profissional) ----
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

-- ---- TASKS ----
create policy "Usuários veem apenas as próprias tarefas"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas com o próprio user_id"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas as próprias tarefas"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários deletam apenas as próprias tarefas"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ---- FINANCIAL ENTRIES ----
create policy "Usuários veem apenas os próprios lançamentos"
  on public.financial_entries for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas com o próprio user_id"
  on public.financial_entries for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas os próprios lançamentos"
  on public.financial_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários deletam apenas os próprios lançamentos"
  on public.financial_entries for delete
  using (auth.uid() = user_id);

-- ---- FINANCIAL CATEGORIES ----
create policy "Usuários veem as próprias categorias financeiras"
  on public.financial_categories for select
  using ((select auth.uid()) = user_id);

create policy "Usuários criam as próprias categorias financeiras"
  on public.financial_categories for insert
  with check ((select auth.uid()) = user_id);

create policy "Usuários atualizam as próprias categorias financeiras"
  on public.financial_categories for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuários deletam as próprias categorias financeiras"
  on public.financial_categories for delete
  using ((select auth.uid()) = user_id);

-- ---- QUICK NOTES ----
create policy "Usuários veem apenas as próprias notas"
  on public.quick_notes for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas com o próprio user_id"
  on public.quick_notes for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas as próprias notas"
  on public.quick_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários deletam apenas as próprias notas"
  on public.quick_notes for delete
  using (auth.uid() = user_id);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================

create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_project_id on public.tasks(project_id);
create index idx_clients_user_id on public.clients(user_id);
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_client_id on public.projects(client_id);
create index idx_financial_entries_user_id on public.financial_entries(user_id);
create index idx_financial_entries_due_date on public.financial_entries(due_date);
create index idx_financial_entries_type on public.financial_entries(type);
create index idx_financial_entries_series_id on public.financial_entries(series_id) where series_id is not null;
create index idx_financial_entries_user_due_date on public.financial_entries(user_id, due_date);
create index idx_financial_categories_user_id on public.financial_categories(user_id);
create unique index idx_financial_categories_unique_name on public.financial_categories(user_id, type, lower(name));
create index idx_quick_notes_user_id on public.quick_notes(user_id);
create index idx_quick_notes_is_pinned on public.quick_notes(is_pinned);
create index idx_quick_notes_user_archive_updated on public.quick_notes(user_id, is_archived, is_pinned, updated_at desc);
create index idx_quick_notes_tags on public.quick_notes using gin(tags);
