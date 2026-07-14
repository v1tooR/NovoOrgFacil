import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import favicon from '@/lib/assets/favicon.svg'

const fontSans = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  applicationName: 'Fácil Organização',
  title: {
    default: 'Fácil Organização',
    template: '%s | Fácil Organização',
  },
  description: 'Central de organização para autônomos e pequenas empresas.',
  manifest: '/manifest.webmanifest',
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: 'Fácil Org',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: {
      url: favicon.src,
      type: 'image/svg+xml',
    },
    apple: {
      url: '/icons/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans`}>
        {children}
        <ServiceWorkerRegistration />
        <Toaster />
      </body>
    </html>
  )
}
