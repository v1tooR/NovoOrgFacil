import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-foreground bg-foreground text-background',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        destructive: 'border-foreground bg-background text-foreground',
        outline: 'text-foreground',
        success: 'border-foreground bg-foreground text-background',
        warning: 'border-foreground/40 bg-muted text-foreground',
        // Task statuses
        pending: 'border-border bg-muted text-muted-foreground',
        in_progress: 'border-foreground bg-foreground text-background',
        completed: 'border-foreground/25 bg-background text-foreground',
        overdue: 'border-foreground border-dashed bg-background text-foreground',
        // Priority
        low: 'border-border bg-muted text-muted-foreground',
        medium: 'border-foreground/40 bg-secondary text-foreground',
        high: 'border-foreground bg-foreground text-background',
        // Finance
        paid: 'border-foreground/25 bg-background text-foreground',
        received: 'border-foreground bg-foreground text-background',
        // Project
        planning: 'border-border bg-muted text-muted-foreground',
        waiting_client: 'border-foreground/40 bg-secondary text-foreground',
        paused: 'border-foreground/20 bg-background text-muted-foreground',
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
