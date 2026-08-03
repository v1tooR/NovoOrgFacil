'use client'

import dynamic from 'next/dynamic'

export const SubscriptionsPanel = dynamic(
  () => import('./SubscriptionsPanel').then((module) => module.SubscriptionsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />)}
      </div>
    ),
  }
)
