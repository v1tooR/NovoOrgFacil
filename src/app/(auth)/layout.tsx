import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Entrar',
    template: '%s | OrganizaFlow',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:flex-1 bg-sidebar flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">OrganizaFlow</span>
          </div>
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-3">
            <p className="text-xl font-medium text-sidebar-foreground leading-relaxed">
              "Tudo que preciso em um lugar só. Tarefas, clientes, projetos e financeiro. Simples assim."
            </p>
            <footer className="text-sm text-sidebar-foreground/60">
              Para freelancers e pequenas empresas que querem organização sem complicação.
            </footer>
          </blockquote>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tarefas do dia', icon: '✓' },
              { label: 'Projetos', icon: '◈' },
              { label: 'Financeiro', icon: '₽' },
              { label: 'Notas rápidas', icon: '✎' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sidebar-foreground/70 text-sm">
                <span className="text-primary text-base">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">© 2025 OrganizaFlow. Todos os direitos reservados.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold tracking-tight">OrganizaFlow</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
