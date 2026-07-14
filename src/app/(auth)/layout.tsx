import type { Metadata } from 'next'
import Image from 'next/image'
import logo from '@/lib/assets/logo.svg'
import icon from '@/lib/assets/icone.svg'

export const metadata: Metadata = {
  title: {
    default: 'Entrar',
    template: '%s | Fácil Organização',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="relative hidden w-[46%] overflow-hidden border-r border-sidebar-border bg-sidebar p-14 lg:flex lg:flex-col lg:justify-between xl:p-20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative">
          <Image
            src={logo}
            alt="Fácil Organização"
            className="h-auto w-52"
            priority
          />
        </div>

        <div className="relative space-y-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-sidebar-foreground/40">Seu trabalho, em ordem.</p>
          <blockquote className="max-w-xl space-y-4">
            <p className="text-2xl font-medium leading-relaxed text-sidebar-foreground xl:text-3xl">
              "Tudo que preciso em um lugar só. Tarefas, clientes, projetos e financeiro. Simples assim."
            </p>
            <footer className="max-w-lg text-xs leading-relaxed text-sidebar-foreground/55">
              Para freelancers e pequenas empresas que querem organização sem complicação.
            </footer>
          </blockquote>

          <div className="grid grid-cols-2 gap-px overflow-hidden border border-sidebar-border bg-sidebar-border">
            {[
              { label: 'Tarefas do dia', icon: '✓' },
              { label: 'Projetos', icon: '◈' },
              { label: 'Financeiro', icon: '₽' },
              { label: 'Notas rápidas', icon: '✎' },
            ].map((item, index) => (
              <div key={item.label} className="flex min-h-20 flex-col justify-between bg-sidebar p-4 text-sidebar-foreground/70">
                <span className="text-[9px] tabular-nums text-sidebar-foreground/35">0{index + 1}</span>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] uppercase tracking-wider text-sidebar-foreground/35">© 2026 Fácil Organização.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 border-b border-foreground/15 pb-6 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center border border-foreground bg-sidebar p-1.5">
              <Image src={icon} alt="" aria-hidden className="h-full w-full" priority />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.14em]">Fácil Organização</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
