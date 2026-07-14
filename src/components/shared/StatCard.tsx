import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary'
  href?: string
  className?: string
  style?: React.CSSProperties
}

const variantStyles = {
  default: 'bg-card border-border',
  success: 'bg-card border-foreground/20',
  warning: 'bg-muted/60 border-foreground/20',
  destructive: 'bg-card border-foreground/40',
  primary: 'bg-foreground text-background border-foreground',
}

const iconStyles = {
  default: 'text-muted-foreground bg-muted',
  success: 'text-background bg-foreground',
  warning: 'text-foreground bg-background border',
  destructive: 'text-foreground bg-background border border-foreground/30',
  primary: 'text-foreground bg-background',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  variant = 'default',
  href,
  className,
  style,
}: StatCardProps) {
  const isFormattedValue = typeof value === 'string'

  const content = (
    <div
      style={style}
      className={cn(
        'group relative space-y-4 overflow-hidden rounded-lg border p-4 [container-type:inline-size] sm:p-5',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-foreground/50 hover:shadow-[4px_4px_0_hsl(var(--foreground)/0.08)]',
        href && 'cursor-pointer',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('min-w-0 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.12em]', variant === 'primary' ? 'text-background/60' : 'text-muted-foreground')}>{label}</span>
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:-rotate-3',
          iconStyles[variant]
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn(
          'font-bold tracking-[-0.06em] tabular-nums',
          isFormattedValue ? 'responsive-financial-value' : 'text-2xl'
        )}>
          {value}
        </p>
        {description && (
          <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {content}
      </Link>
    )
  }

  return content
}
