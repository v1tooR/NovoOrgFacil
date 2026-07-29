-- ============================================================
-- Migration 007 — CRM / Funil de leads (plano Profissional)
-- Execute depois de 004_account_type_security.sql.
-- ============================================================
--
-- Cria o funil comercial: cada lead percorre os estágios
--   new → contacted → proposal → negotiation → won / lost
-- e, ao ser ganho, pode ser convertido em um cliente (client_id).
--
-- Segue o mesmo gate de plano de clients/projects: só o plano
-- Profissional (is_freelancer()) lê e escreve. As linhas de um
-- usuário que voltou ao Pessoal continuam armazenadas e reaparecem
-- quando ele reativa o plano.

create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  company text,
  email text,
  phone text,
  source text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost')),
  value numeric(12,2) not null default 0 check (value >= 0),
  notes text,
  expected_close_date date,
  -- Preenchido quando o lead é convertido em cliente (Ganho).
  client_id uuid references public.clients(id) on delete set null,
  lost_reason text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- updated_at automático (reutiliza a função existente).
drop trigger if exists handle_updated_at on public.leads;
create trigger handle_updated_at before update on public.leads
  for each row execute procedure public.handle_updated_at();

-- ---- Row Level Security (gated por plano Profissional) ----
alter table public.leads enable row level security;

drop policy if exists "Profissionais veem os próprios leads" on public.leads;
drop policy if exists "Profissionais criam os próprios leads" on public.leads;
drop policy if exists "Profissionais atualizam os próprios leads" on public.leads;
drop policy if exists "Profissionais deletam os próprios leads" on public.leads;

create policy "Profissionais veem os próprios leads"
  on public.leads for select
  using ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais criam os próprios leads"
  on public.leads for insert
  with check ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais atualizam os próprios leads"
  on public.leads for update
  using ((select auth.uid()) = user_id and (select public.is_freelancer()))
  with check ((select auth.uid()) = user_id and (select public.is_freelancer()));

create policy "Profissionais deletam os próprios leads"
  on public.leads for delete
  using ((select auth.uid()) = user_id and (select public.is_freelancer()));

-- ---- Índices ----
create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_stage on public.leads(user_id, stage);
create index if not exists idx_leads_client_id on public.leads(client_id);
