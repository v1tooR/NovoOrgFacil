import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import favicon from '@/lib/assets/favicon.svg'

const fontSans = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Fácil Organização',
    template: '%s | Fácil Organização',
  },
  description: 'Central de organização para autônomos e pequenas empresas.',
  icons: {
    icon: {
      url: favicon.src,
      type: 'image/svg+xml',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
