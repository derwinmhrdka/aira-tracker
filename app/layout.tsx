import type { Metadata, Viewport } from 'next'
import { PwaRegister } from '@/components/pwa-register'
import { Providers } from '@/components/providers'
import { SnowDecor } from '@/components/snow-decor'
import './globals.css'

export const metadata: Metadata = {
  title: 'Baby Tracker',
  description: 'Private baby tracking app for feeding, sleep, and growth',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Baby Tracker',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafd' },
    { media: '(prefers-color-scheme: dark)', color: '#1a2642' },
  ],
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="bg-background" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <SnowDecor />
        <div className="relative z-10">
          <Providers>{children}</Providers>
          <PwaRegister />
        </div>
      </body>
    </html>
  )
}
