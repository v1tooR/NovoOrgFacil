-- ============================================================
-- Migration 008 — Assinaturas recorrentes
-- Execute depois de 005_financial_scheduling.sql.
-- ============================================================
--
-- Uma assinatura é o "contrato" (Netflix, Adobe, aluguel de sala…):
-- guarda valor, ciclo e a próxima cobrança. Cada pagamento registrado
-- gera um lançamento em financial_entries com subscription_id, então o
-- histórico continua vivendo no financeiro e a assinatura fica sendo a
-- fonte de verdade do gasto recorrente.
--
-- Disponível nos dois planos (Pessoal e Profissional): a RLS é apenas
-- por usuário. Os vínculos com cliente/projeto são opcionais e ficam
-- protegidos pelas policies das próprias tabelas.

create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  amount numeric(12,2) not null check (amount > 0),
  cycle text not null default 'monthly'
    check (cycle in ('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly')),
  category text not null default 'Assinaturas',
  payment_method text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'canceled')),
  next_charge_date date not null,
  started_at date,
  canceled_at date,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- updated_at automático (reutiliza a função existente).
drop trigger if exists handle_updated_at on public.subscriptions;
create trigger handle_updated_at before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- Lista principal: assinaturas do usuário ordenadas pela próxima cobrança.
create index if not exists idx_subscriptions_user_next_charge
  on public.subscriptions (user_id, status, next_charge_date);

-- ---- Row Level Security ----
alter table public.subscriptions enable row level security;

drop policy if exists "Usuários veem as próprias assinaturas" on public.subscriptions;
drop policy if exists "Usuários criam as próprias assinaturas" on public.subscriptions;
drop policy if exists "Usuários atualizam as próprias assinaturas" on public.subscriptions;
drop policy if exists "Usuários deletam as próprias assinaturas" on public.subscriptions;

create policy "Usuários veem as próprias assinaturas"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id);

create policy "Usuários criam as próprias assinaturas"
  on public.subscriptions for insert
  with check ((select auth.uid()) = user_id);

create policy "Usuários atualizam as próprias assinaturas"
  on public.subscriptions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuários deletam as próprias assinaturas"
  on public.subscriptions for delete
  using ((select auth.uid()) = user_id);

-- ---- Vínculo com o lançamento gerado ----
-- on delete set null: apagar a assinatura preserva o histórico de gastos.
alter table public.financial_entries
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

create index if not exists idx_financial_entries_subscription_id
  on public.financial_entries (subscription_id)
  where subscription_id is not null;
