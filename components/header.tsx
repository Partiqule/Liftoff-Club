'use client'

import { Logo, Wordmark } from '@/components/logo'
import { SiteSearch } from '@/components/site-search'
import { useClub } from '@/components/club-provider'
import { zoneAbbrev } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const LINKS: { href: string; label: string; prefetch?: false }[] = [
  { href: '/', label: 'Home' },
  { href: '/launches', label: 'Launches' },
  { href: '/sky', label: 'Sky' },
  { href: '/brief', label: 'Brief', prefetch: false },
  { href: '/settings', label: 'For parents', prefetch: false },
]

export function Header() {
  const pathname = usePathname()
  return <HeaderBar key={pathname} pathname={pathname} />
}

function HeaderBar({ pathname }: { pathname: string }) {
  const { settings, updateSettings } = useClub()
  const zone = useActiveZone()
  const kids = settings.kidsMode
  const town = settings.location?.label.split(',')[0] || 'Set your location'
  const [menuOpen, setMenuOpen] = useState(false)
  const focusSearch = useRef(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (event.key !== '/') return
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (typing) return
      focusSearch.current = true
      setMenuOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!menuOpen || !focusSearch.current) return
    focusSearch.current = false
    document.getElementById('site-search')?.focus()
  }, [menuOpen])

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
              <Link key={link.href} href={link.href} prefetch={link.prefetch} aria-current={current(pathname, link.href) ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-tools"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
          <div id="site-tools" className={menuOpen ? 'top-tools is-open' : 'top-tools'}>
            <SiteSearch />
            <Link className="pro-entry" href="/pro" prefetch={false}>
              Pro
            </Link>
            <Link className="place-chip" href="/settings#place">
              {settings.location ? `${town} · ${zoneAbbrev(zone)}` : 'Set your location'}
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
              role="switch"
              aria-checked={settings.nightRed}
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
          <Link key={link.href} href={link.href} prefetch={link.prefetch} aria-current={current(pathname, link.href) ? 'page' : undefined}>
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
