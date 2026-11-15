import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Atkinson_Hyperlegible, Fraunces, IBM_Plex_Mono } from 'next/font/google'
import Script from 'next/script'
import { ClubAnalytics } from '@/components/analytics'
import { ClubProvider } from '@/components/club-provider'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { getLaunches } from '@/lib/launches'
import { toBrief } from '@/lib/schedule'
import { siteUrl } from '@/lib/site'
import './globals.css'

const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
})

const body = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-atkinson',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Liftoff Club', template: '%s · Liftoff Club' },
  description: 'A family companion for rocket launches and the night sky. Kids mode on, bedtime quiet hours, and a plain answer to “can we see it from here?”',
  applicationName: 'Liftoff Club',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Liftoff Club', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'Liftoff Club',
    description: 'Watch the launch board, then step outside if the station is walking over your town.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#081018',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export const revalidate = 3600

export default async function RootLayout({ children }: { children: ReactNode }) {
  const board = await getLaunches()
  const briefs = board.launches.map(toBrief)
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
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
