import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'text-foreground',
        success: 'border-transparent bg-success/10 text-success',
        warning: 'border-transparent bg-warning/10 text-warning',
        // Task statuses
        pending: 'border-transparent bg-slate-100 text-slate-600',
        in_progress: 'border-transparent bg-blue-50 text-blue-600',
        completed: 'border-transparent bg-green-50 text-green-600',
        overdue: 'border-transparent bg-red-50 text-red-600',
        // Priority
        low: 'border-transparent bg-slate-100 text-slate-500',
        medium: 'border-transparent bg-amber-50 text-amber-600',
        high: 'border-transparent bg-red-50 text-red-500',
        // Finance
        paid: 'border-transparent bg-green-50 text-green-600',
        received: 'border-transparent bg-emerald-50 text-emerald-600',
        // Project
        planning: 'border-transparent bg-purple-50 text-purple-600',
        waiting_client: 'border-transparent bg-orange-50 text-orange-600',
        paused: 'border-transparent bg-slate-100 text-slate-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
