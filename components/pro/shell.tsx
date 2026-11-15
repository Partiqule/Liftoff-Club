'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Logo, Wordmark } from '@/components/logo'

const LINKS = [
  { href: '/pro', label: 'Desk' },
  { href: '/pro/watchlist', label: 'Watchlist' },
  { href: '/pro/tracker', label: 'Tracker' },
  { href: '/pro/manifest', label: 'Manifest' },
  { href: '/pro/alerts', label: 'Alerts' },
  { href: '/pro/brief', label: 'Brief' },
]

export function ProShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="pro-app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="pro-bar">
        <div className="wrap pro-bar-inner">
          <Link className="brand" href="/pro">
            <Logo />
            <span className="brand-words">
              <span className="pro-brand-line">
                <Wordmark />
                <span className="pro-mark">Pro</span>
              </span>
              <span className="tagline">Industry desk</span>
            </span>
          </Link>
          <nav className="pro-nav" aria-label="Pro">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={current(pathname, link.href) ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link className="pro-family" href="/">
            Family site
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}

function current(pathname: string, href: string): boolean {
  if (href === '/pro') return pathname === '/pro'
  return pathname === href || pathname.startsWith(`${href}/`)
}
