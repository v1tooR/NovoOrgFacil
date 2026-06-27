'use client'

import Link from 'next/link'
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
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-bold text-sidebar-foreground tracking-tight">OrganizaFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary/20 text-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
              {item.label}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-sidebar-border pt-3">
        <Link
          href="/app/configuracoes"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            pathname === '/app/configuracoes'
              ? 'bg-primary/20 text-primary'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5'
          )}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>

        <div className="flex items-center gap-3 px-3 py-2.5 mt-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs">
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
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
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
