'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogOut, Settings } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/actions/auth'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'
import icon from '@/lib/assets/icone.svg'

interface HeaderProps {
  profile: Profile | null
  email: string | undefined
}

export function Header({ profile, email }: HeaderProps) {
  return (
    <header className="pwa-safe-top sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-sidebar px-4 text-sidebar-foreground lg:hidden">
      <Link href="/app" className="flex items-center gap-2" aria-label="Ir para o início">
        <span className="flex h-9 w-9 items-center justify-center border border-white/20 bg-sidebar p-1.5">
          <Image src={icon} alt="" aria-hidden className="h-full w-full" priority />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">Fácil Organização</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar" aria-label="Abrir menu da conta">
            <Avatar className="h-9 w-9 border border-white/25">
              <AvatarFallback className="bg-white text-xs font-semibold text-black">
                {getInitials(profile?.full_name || email)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Link href="/app/configuracoes">
            <DropdownMenuItem>
              <Settings className="h-4 w-4" />
              Configurações
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <form action={logout}>
            <DropdownMenuItem asChild variant="destructive">
              <button type="submit" className="w-full cursor-pointer">
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
