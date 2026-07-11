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
  success: 'bg-success/[0.06] border-success/15 hover:border-success/30',
  warning: 'bg-warning/[0.06] border-warning/15 hover:border-warning/30',
  destructive: 'bg-destructive/[0.06] border-destructive/15 hover:border-destructive/30',
  primary: 'bg-primary/[0.06] border-primary/15 hover:border-primary/30',
}

const iconStyles = {
  default: 'text-muted-foreground bg-muted',
  success: 'text-success bg-success/15',
  warning: 'text-warning bg-warning/15',
  destructive: 'text-destructive bg-destructive/15',
  primary: 'text-primary bg-primary/15',
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
  const content = (
    <div
      style={style}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4 space-y-3',
        'transition-all duration-200 ease-out',
        'hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
        href && 'cursor-pointer',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
          iconStyles[variant]
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
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
