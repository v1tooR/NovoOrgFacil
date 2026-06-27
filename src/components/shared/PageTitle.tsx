import { cn } from '@/lib/utils'

interface PageTitleProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageTitle({ title, description, action, className }: PageTitleProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
