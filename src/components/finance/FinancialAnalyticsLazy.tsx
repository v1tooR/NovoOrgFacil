'use client'

import dynamic from 'next/dynamic'

export const FinancialAnalytics = dynamic(
  () => import('./FinancialAnalytics').then((module) => module.FinancialAnalytics),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    ),
  }
)
