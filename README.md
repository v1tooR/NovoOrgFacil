# OrganizaFlow

Central de organização para autônomos, freelancers e pequenas empresas.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (Auth + Postgres + RLS)
- **Tailwind CSS** + **shadcn/ui**
- **React Hook Form** + **Zod**
- **date-fns** + **Recharts**

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha com suas credenciais do Supabase.

### 3. Configurar banco de dados

No painel do Supabase, acesse **SQL Editor** e execute o arquivo `supabase/schema.sql` completo.

### 4. Iniciar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Estrutura

```
src/
  app/
    (auth)/          # Login, registro, recuperação de senha
    app/             # Área privada (/app/*)
  actions/           # Server Actions (mutations)
  components/
    layout/          # Sidebar, Header, MobileBottomNav
    shared/          # StatCard, EmptyState, ConfirmDeleteDialog...
    tasks/           # TaskCard, CreateTaskDialog, EditTaskDialog
    projects/        # ProjectCard, CreateProjectDialog
    clients/         # ClientCard, CreateClientDialog
    finance/         # FinanceCard, CreateFinanceDialog
    notes/           # NoteCard, CreateNoteDialog
    ui/              # Componentes shadcn/ui
  lib/
    supabase/        # client.ts (browser) + server.ts (SSR)
    validations/     # Schemas Zod
    utils.ts
  types/             # TypeScript interfaces
  middleware.ts      # Proteção de rotas
```

## Deploy (Vercel)

1. Conecte o repositório na Vercel
2. Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`)
3. Deploy automático no push para `main`

## Módulos

| Módulo | Rota | Funcionalidades |
|--------|------|-----------------|
| Dashboard | `/app` | Visão geral do dia |
| Tarefas | `/app/tarefas` | CRUD + prioridade + status |
| Projetos | `/app/projetos` | CRUD + status + prazo |
| Clientes | `/app/clientes` | CRUD + busca |
| Financeiro | `/app/financeiro` | Receitas/despesas + resumo mensal |
| Notas | `/app/notas` | CRUD + fixar + busca |
| Configurações | `/app/configuracoes` | Perfil + logout |
