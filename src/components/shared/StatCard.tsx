import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary'
  className?: string
}

const variantStyles = {
  default: 'bg-card border-border',
  success: 'bg-green-50 border-green-100',
  warning: 'bg-amber-50 border-amber-100',
  destructive: 'bg-red-50 border-red-100',
  primary: 'bg-primary/5 border-primary/10',
}

const iconStyles = {
  default: 'text-muted-foreground bg-muted',
  success: 'text-green-600 bg-green-100',
  warning: 'text-amber-600 bg-amber-100',
  destructive: 'text-red-600 bg-red-100',
  primary: 'text-primary bg-primary/10',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-3 transition-all', variantStyles[variant], className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}
