'use client'

import { createContext, useContext } from 'react'
import type { AccountType } from '@/types'

interface AccountTypeContextValue {
  accountType: AccountType
  isFreelancer: boolean
}

const AccountTypeContext = createContext<AccountTypeContextValue>({
  accountType: 'personal',
  isFreelancer: false,
})

export function AccountTypeProvider({
  accountType,
  children,
}: {
  accountType?: AccountType | null
  children: React.ReactNode
}) {
  const normalizedType: AccountType = accountType === 'freelancer' ? 'freelancer' : 'personal'

  return (
    <AccountTypeContext.Provider
      value={{ accountType: normalizedType, isFreelancer: normalizedType === 'freelancer' }}
    >
      {children}
    </AccountTypeContext.Provider>
  )
}

export function useAccountType() {
  return useContext(AccountTypeContext)
}
