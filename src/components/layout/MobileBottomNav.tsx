'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, FolderKanban, Wallet, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/app', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/app/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/app/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/app/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/app/notas', label: 'Notas', icon: StickyNote },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-0',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] font-medium truncate', active && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
