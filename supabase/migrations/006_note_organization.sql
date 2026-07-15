-- ============================================================
-- Migration 006 — Organização e foco das notas
-- Execute depois de 005_financial_scheduling.sql.
-- ============================================================

alter table public.quick_notes
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists note_color text not null default 'default',
  add column if not exists is_archived boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quick_notes_note_color_check'
      and conrelid = 'public.quick_notes'::regclass
  ) then
    alter table public.quick_notes
      add constraint quick_notes_note_color_check
      check (note_color in ('default', 'yellow', 'blue', 'green', 'rose', 'purple'));
  end if;
end $$;

create index if not exists idx_quick_notes_user_archive_updated
  on public.quick_notes (user_id, is_archived, is_pinned, updated_at desc);
create index if not exists idx_quick_notes_tags
  on public.quick_notes using gin (tags);
