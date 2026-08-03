-- ============================================================
-- Migration 009 — Importação de extrato OFX
-- Execute depois de 008_subscriptions.sql.
-- ============================================================
--
-- Cada transação de um extrato OFX carrega um FITID: identificador
-- único e estável atribuído pelo banco. Guardá-lo no lançamento é o
-- que torna a importação idempotente — reimportar o mesmo extrato
-- (ou extratos com período sobreposto) não duplica nada.
--
-- O índice único é parcial: só vale para linhas importadas, então
-- lançamentos manuais seguem sem restrição.

alter table public.financial_entries
  add column if not exists import_fitid text,
  add column if not exists import_source text,
  add column if not exists import_account text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_entries_import_source_check'
      and conrelid = 'public.financial_entries'::regclass
  ) then
    alter table public.financial_entries
      add constraint financial_entries_import_source_check
      check (import_source is null or import_source in ('ofx'));
  end if;
end $$;

-- Garantia de idempotência no banco, independente do filtro da aplicação.
create unique index if not exists idx_financial_entries_import_fitid
  on public.financial_entries (user_id, import_fitid)
  where import_fitid is not null;
