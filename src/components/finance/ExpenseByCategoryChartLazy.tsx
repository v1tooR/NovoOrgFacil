'use client'

import dynamic from 'next/dynamic'

export const ExpenseByCategoryChart = dynamic(
  () => import('./ExpenseByCategoryChart').then((m) => m.ExpenseByCategoryChart),
  {
    ssr: false,
    loading: () => <div className="h-24 rounded-lg bg-muted animate-pulse" />,
  }
)
