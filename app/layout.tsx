import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource/gloock/latin-400.css'
import '@fontsource/inclusive-sans/latin-400.css'
import '@fontsource/inclusive-sans/latin-500.css'
import Script from 'next/script'
import { ClubAnalytics } from '@/components/analytics'
import { ClubProvider } from '@/components/club-provider'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { getLaunches } from '@/lib/launches'
import { toBrief } from '@/lib/schedule'
import { siteUrl } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Liftoff Club', template: '%s · Liftoff Club' },
  description: 'A family companion for rocket launches and the night sky. Kids mode on, bedtime quiet hours, and a plain answer to “can we see it from here?”',
  applicationName: 'Liftoff Club',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Liftoff Club', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'Liftoff Club',
    description: 'Watch the launch board, then step outside if the station is crossing your town.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#07060f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export const revalidate = 3600

export default async function RootLayout({ children }: { children: ReactNode }) {
  const board = await getLaunches()
  const briefs = board.launches.map(toBrief)
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="galaxy" aria-hidden="true">
          <div className="field-nebula" />
          <div className="field-stars field-stars-far" />
          <div className="field-stars field-stars-mid" />
          <div className="field-stars field-stars-near" />
        </div>
        <Script id="liftoff-voice" strategy="beforeInteractive">
          {`try{var s=JSON.parse(localStorage.getItem('liftoff-club-v1')||'{}');document.documentElement.dataset.voice=s.kidsMode===false?'adult':'kid';}catch(e){document.documentElement.dataset.voice='kid';}`}
        </Script>
        <ClubProvider briefs={briefs}>
          <Header />
          {children}
          <Footer />
          <ClubAnalytics />
        </ClubProvider>
      </body>
    </html>
  )
}
