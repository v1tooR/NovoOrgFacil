'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, FolderKanban, Wallet, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountType } from '@/types'

const navItems = [
  { href: '/app', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/app/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/app/projetos', label: 'Projetos', icon: FolderKanban, freelancerOnly: true },
  { href: '/app/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/app/notas', label: 'Notas', icon: StickyNote },
]

interface MobileBottomNavProps {
  accountType?: AccountType | null
}

export function MobileBottomNav({ accountType }: MobileBottomNavProps) {
  const pathname = usePathname()

  const isFreelancer = accountType === 'freelancer'
  const items = navItems.filter((item) => !item.freelancerOnly || isFreelancer)

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="safe-area-pb fixed bottom-3 left-3 right-3 z-50 overflow-hidden rounded-xl border border-white/15 bg-sidebar text-sidebar-foreground shadow-2xl lg:hidden">
      <div className="flex h-16 items-center justify-around px-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-sidebar-foreground/45 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                active && 'text-sidebar-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] font-medium truncate', active && 'font-semibold')}>
                {item.label}
              </span>
              <span className={cn('absolute bottom-0 h-px w-5 bg-white transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
