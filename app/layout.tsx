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
  description: 'Look up together. A family companion for rocket launches and the night sky, with kids mode on and a plain answer about whether you can see it.',
  applicationName: 'Liftoff Club',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Liftoff Club', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'Liftoff Club',
    description: 'Look up together. Launches, the night sky, and a plain answer about whether you can see it from your town.',
    type: 'website',
    siteName: 'Liftoff Club',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liftoff Club',
    description: 'Look up together. Launches and the night sky, for the kitchen table.',
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
          {`try{var s=JSON.parse(localStorage.getItem('liftoff-club-v1')||'{}');document.documentElement.dataset.voice=s.kidsMode===false?'adult':'kid';document.documentElement.dataset.night=s.nightRed===true?'red':'sky';}catch(e){document.documentElement.dataset.voice='kid';document.documentElement.dataset.night='sky';}`}
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
