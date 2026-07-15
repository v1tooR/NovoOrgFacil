-- ============================================================
-- Migration 005 — Categorias e agendamento financeiro
-- Execute depois de 004_account_type_security.sql.
-- ============================================================

create table if not exists public.financial_categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz default now() not null
);

create unique index if not exists idx_financial_categories_unique_name
  on public.financial_categories (user_id, type, lower(name));
create index if not exists idx_financial_categories_user_id
  on public.financial_categories (user_id);

alter table public.financial_categories enable row level security;

drop policy if exists "Usuários veem as próprias categorias financeiras" on public.financial_categories;
drop policy if exists "Usuários criam as próprias categorias financeiras" on public.financial_categories;
drop policy if exists "Usuários atualizam as próprias categorias financeiras" on public.financial_categories;
drop policy if exists "Usuários deletam as próprias categorias financeiras" on public.financial_categories;

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

alter table public.financial_entries
  add column if not exists series_id uuid,
  add column if not exists series_type text,
  add column if not exists series_number integer,
  add column if not exists series_count integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_entries_series_consistency'
      and conrelid = 'public.financial_entries'::regclass
  ) then
    alter table public.financial_entries
      add constraint financial_entries_series_consistency check (
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
      );
  end if;
end $$;

create index if not exists idx_financial_entries_series_id
  on public.financial_entries (series_id)
  where series_id is not null;
create index if not exists idx_financial_entries_user_due_date
  on public.financial_entries (user_id, due_date);
