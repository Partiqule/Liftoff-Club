'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Logo, Wordmark } from '@/components/logo'
import { AccessForm } from '@/components/pro/access-form'
import { ArrivalDialog } from '@/components/pro/arrival-dialog'
import { Modal } from '@/components/pro/modal'
import { deskChrome, type AccessLevel } from '@/lib/pro/access-gate'
import { PRO_COPY } from '@/lib/pro/copy'
import { track } from '@/lib/track'

const LINKS = [
  { href: '/pro', label: 'Desk' },
  { href: '/pro/watchlist', label: 'Watchlist' },
  { href: '/pro/tracker', label: 'Tracker' },
  { href: '/pro/manifest', label: 'Manifest' },
  { href: '/pro/alerts', label: 'Alerts' },
  { href: '/pro/brief', label: 'Brief' },
  { href: '/pro/vehicles', label: 'Vehicles' },
  { href: '/pro/filings', label: 'Filings' },
  { href: '/pro/slips', label: 'Slips' },
  { href: '/pro/digest', label: 'Digest' },
]

export function ProShell({ children, level, email }: { children: ReactNode; level: AccessLevel; email: string | null }) {
  const pathname = usePathname()
  const chrome = deskChrome(level)
  const [accessOpen, setAccessOpen] = useState(false)
  useEffect(() => {
    const open = () => setAccessOpen(true)
    window.addEventListener('liftoff-open-access', open)
    return () => window.removeEventListener('liftoff-open-access', open)
  }, [])
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
          {chrome.signOut ? (
            <form className="pro-signed" action="/api/pro/sign-out" method="post">
              <span className="meta">{email ? `Signed in as ${email}` : 'Signed in'}</span>
              <button className="pro-cta" type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <button
              className="pro-cta"
              type="button"
              onClick={() => {
                track('pro_access_clicked')
                setAccessOpen(true)
              }}
            >
              Request early access
            </button>
          )}
          <Link className="pro-family" href="/">
            Family site
          </Link>
        </div>
      </header>
      <Suspense fallback={null}>
        <ArrivalDialog level={level} />
      </Suspense>
      {accessOpen ? <AccessDialog onClose={() => setAccessOpen(false)} /> : null}
      {children}
      <footer className="pro-foot">
        <div className="wrap">
          <p>{PRO_COPY.footerLine}</p>
        </div>
      </footer>
    </div>
  )
}

function AccessDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal labelledBy="access-title" onClose={onClose}>
      <h2 id="access-title">{PRO_COPY.accessTitle}</h2>
      <p>{PRO_COPY.accessBody}</p>
      <p className="meta">{PRO_COPY.offer}</p>
      <AccessForm />
      <p className="note">{PRO_COPY.savedBody}</p>
      <button className="btn" type="button" onClick={onClose}>
        Close
      </button>
    </Modal>
  )
}

function current(pathname: string, href: string): boolean {
  if (href === '/pro') return pathname === '/pro'
  return pathname === href || pathname.startsWith(`${href}/`)
}
