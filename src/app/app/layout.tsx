import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Header } from '@/components/layout/Header'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="app-canvas min-h-screen bg-background">
      <Sidebar profile={profile as Profile | null} email={user.email} />
      <Header profile={profile as Profile | null} email={user.email} />

      <main className="min-h-screen pb-28 lg:ml-72 lg:pb-0">
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
          {children}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
