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
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Notas rápidas
create table public.quick_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  is_pinned boolean default false not null,
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
-- ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.financial_entries enable row level security;
alter table public.quick_notes enable row level security;

-- ---- PROFILES ----
create policy "Usuários podem ver apenas o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar apenas o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- CLIENTS ----
create policy "Usuários veem apenas os próprios clientes"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas com o próprio user_id"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas os próprios clientes"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários deletam apenas os próprios clientes"
  on public.clients for delete
  using (auth.uid() = user_id);

-- ---- PROJECTS ----
create policy "Usuários veem apenas os próprios projetos"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas com o próprio user_id"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas os próprios projetos"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários deletam apenas os próprios projetos"
  on public.projects for delete
  using (auth.uid() = user_id);

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
create index idx_quick_notes_user_id on public.quick_notes(user_id);
create index idx_quick_notes_is_pinned on public.quick_notes(is_pinned);
