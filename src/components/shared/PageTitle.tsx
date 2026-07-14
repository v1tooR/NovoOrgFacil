import { cn } from '@/lib/utils'

interface PageTitleProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageTitle({ title, description, action, className }: PageTitleProps) {
  return (
    <div className={cn('mb-8 flex flex-col items-start justify-between gap-5 border-b border-foreground/15 pb-5 sm:flex-row sm:items-end', className)}>
      <div className="min-w-0">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workspace / Geral</p>
        <h1 className="text-2xl font-bold leading-none tracking-[-0.05em] text-foreground sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  )
}
