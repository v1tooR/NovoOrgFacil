'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Wallet,
  StickyNote,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'
import logo from '@/lib/assets/logo.svg'

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/app/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/app/clientes', label: 'Clientes', icon: Users },
  { href: '/app/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/app/notas', label: 'Notas', icon: StickyNote },
]

interface SidebarProps {
  profile: Profile | null
  email: string | undefined
}

export function Sidebar({ profile, email }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      {/* Logo */}
      <div className="flex h-24 shrink-0 items-center border-b border-sidebar-border px-7">
        <Link href="/app" aria-label="Ir para o início">
          <Image src={logo} alt="Fácil Organização" className="h-auto w-44" priority />
        </Link>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.24em] text-sidebar-foreground/40">Navegação</p>
        <div className="space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex min-h-11 items-center gap-3 rounded-md px-3 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground',
                active
                  ? 'bg-sidebar-foreground text-sidebar shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="w-5 text-[9px] tabular-nums opacity-45">0{index + 1}</span>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              <span className={cn('ml-auto h-1.5 w-1.5 rounded-full border', active ? 'border-sidebar bg-sidebar' : 'border-sidebar-foreground/30')} />
            </Link>
          )
        })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="space-y-3 border-t border-sidebar-border p-4">
        <Link
          href="/app/configuracoes"
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-md px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground',
            pathname === '/app/configuracoes'
              ? 'bg-sidebar-foreground text-sidebar'
              : 'text-sidebar-foreground/60 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>

        <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-foreground/[0.04] p-3">
          <Avatar className="h-9 w-9 shrink-0 border border-sidebar-foreground/20">
            <AvatarFallback className="bg-sidebar-foreground text-xs font-semibold text-sidebar">
              {getInitials(profile?.full_name || email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md p-2 text-sidebar-foreground/40 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
