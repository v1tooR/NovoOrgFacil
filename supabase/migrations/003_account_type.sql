-- ============================================================
-- Migration 003 — Tipo de conta (Pessoal / Profissional)
-- Execute este SQL no Supabase SQL Editor (uma vez).
-- ============================================================
--
-- Adiciona `account_type` na tabela profiles para separar dois planos:
--   'personal'   → Pessoal   (Tarefas, Financeiro, Notas)
--   'freelancer' → Profissional (tudo + Projetos e Clientes)
--
-- Todos os usuários (novos e existentes) recebem 'personal' por padrão.
-- O upgrade para 'freelancer' é feito em Configurações.
--
-- A trigger handle_new_user não muda: o default cobre novos cadastros.
-- As regras de acesso do plano são aplicadas na migration 004.

alter table public.profiles
  add column if not exists account_type text not null default 'personal'
    check (account_type in ('personal', 'freelancer'));
