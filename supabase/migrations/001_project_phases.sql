-- ============================================================
-- Migration 001 — Fases / Processos dos projetos
-- Execute este SQL no Supabase SQL Editor (uma vez).
-- ============================================================
--
-- Adiciona uma coluna `phases` (jsonb) na tabela projects para armazenar
-- um checklist ordenado de fases/etapas do projeto.
--
-- Estrutura esperada de cada item:
--   { "id": "uuid", "title": "texto", "done": false }
--
-- Fica na própria linha do projeto, então herda o RLS existente —
-- nenhuma policy adicional é necessária.

alter table public.projects
  add column if not exists phases jsonb not null default '[]'::jsonb;
