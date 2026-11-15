'use client'

import { Logo, Wordmark } from '@/components/logo'
import { SiteSearch } from '@/components/site-search'
import { useClub } from '@/components/club-provider'
import { zoneAbbrev } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Tonight' },
  { href: '/launches', label: 'Launches' },
  { href: '/sky', label: 'Sky' },
  { href: '/brief', label: 'Brief' },
  { href: '/settings', label: 'For parents' },
]

export function Header() {
  const pathname = usePathname()
  const { settings, updateSettings } = useClub()
  const zone = useActiveZone()
  const kids = settings.kidsMode
  const town = settings.location?.label.split(',')[0] || 'Set your town'
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link className="brand" href="/">
            <Logo />
            <span className="brand-words">
              <Wordmark />
              <span className="tagline">Look up together</span>
            </span>
          </Link>
          <nav className="top-nav" aria-label="Primary">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={current(pathname, link.href) ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
          <SiteSearch />
          <div className="top-tools">
            <Link className="pro-entry" href="/pro">
              Pro
            </Link>
            <Link className="place-chip" href="/settings#place">
              {town} · {zoneAbbrev(zone)}
            </Link>
            <button
              className="switch"
              type="button"
              role="switch"
              aria-checked={kids}
              onClick={() => updateSettings((current) => ({ ...current, kidsMode: !current.kidsMode }))}
            >
              <span className="switch-ui" data-on={kids ? 'true' : 'false'} />
              <span className="switch-label">Kids mode</span>
            </button>
            <button
              className="switch"
              type="button"
              aria-pressed={settings.nightRed}
              onClick={() => updateSettings((current) => ({ ...current, nightRed: !current.nightRed }))}
            >
              <span className="switch-ui" data-on={settings.nightRed ? 'true' : 'false'} />
              <span className="switch-label">Night red</span>
            </button>
          </div>
        </div>
      </header>
      <nav className="tabbar" aria-label="Primary mobile">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current(pathname, link.href) ? 'page' : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

function current(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
