import type { ReactNode } from 'react'

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="patch" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="#101a24" stroke="#f4ecdc" strokeWidth="1.6" />
      <circle cx="36" cy="36" r="28.5" fill="none" stroke="#ff7a3c" strokeWidth="1.1" strokeDasharray="1.6 2.4" />
      {children}
    </svg>
  )
}

export function patchKind(provider: string, rocket: string): string {
  const text = `${provider} ${rocket}`.toLowerCase()
  if (text.includes('spacex') || text.includes('falcon') || text.includes('starship')) return 'spacex'
  if (text.includes('nasa') || text.includes('sls')) return 'nasa'
  if (text.includes('rocket lab') || text.includes('electron')) return 'electron'
  if (text.includes('blue origin') || text.includes('new glenn')) return 'blue'
  if (text.includes('ula') || text.includes('united launch') || text.includes('vulcan') || text.includes('atlas')) return 'ula'
  if (text.includes('soyuz') || text.includes('roscosmos')) return 'soyuz'
  if (text.includes('jaxa') || text.includes('h3') || text.includes('mitsubishi')) return 'jaxa'
  if (text.includes('isro') || text.includes('gslv') || text.includes('pslv') || text.includes('lvm')) return 'isro'
  if (text.includes('arian') || text.includes('esa')) return 'esa'
  if (text.includes('long march') || text.includes('casc') || text.includes('china')) return 'china'
  return 'generic'
}

export function Patch({ provider, rocket }: { provider: string; rocket: string }) {
  const kind = patchKind(provider, rocket)
  return <Frame>{symbols[kind] ?? symbols.generic}</Frame>
}

const symbols: Record<string, ReactNode> = {
  spacex: (
    <>
      <path d="M36 16l6 12H30l6-12z" fill="#ff7a3c" />
      <rect x="33" y="28" width="6" height="16" fill="#f4ecdc" />
      <path d="M33 40l-6 8h6zM39 40l6 8h-6z" fill="#ff7a3c" />
      <path d="M34.5 44h3L36 50z" fill="#ffb089" />
    </>
  ),
  nasa: (
    <>
      <path d="M18 42c8-10 28-10 36 0" fill="none" stroke="#d7e7ef" strokeWidth="2" />
      <path d="M36 18l3.2 7.2 7.8.6-6 5 1.8 7.4L36 34.4 29.2 38.2 31 30.8l-6-5 7.8-.6z" fill="#ff7a3c" />
    </>
  ),
  electron: (
    <>
      <rect x="34" y="18" width="4" height="28" fill="#f4ecdc" />
      <path d="M36 12l3.5 6h-7z" fill="#ff7a3c" />
      <circle cx="36" cy="40" r="8" fill="none" stroke="#8eafbe" strokeWidth="1.4" />
    </>
  ),
  blue: (
    <>
      <path d="M20 46c8-18 24-18 32 0" fill="none" stroke="#d7e7ef" strokeWidth="2.4" />
      <path d="M36 16v22" stroke="#ff7a3c" strokeWidth="2" />
      <circle cx="36" cy="16" r="2.2" fill="#ff7a3c" />
    </>
  ),
  ula: (
    <>
      <circle cx="28" cy="30" r="6" fill="none" stroke="#f4ecdc" strokeWidth="2" />
      <circle cx="44" cy="30" r="6" fill="#ff7a3c" />
      <path d="M22 46h28" stroke="#8eafbe" strokeWidth="2" />
    </>
  ),
  soyuz: (
    <>
      <path d="M36 16l4 8h-8z" fill="#ff7a3c" />
      <rect x="32" y="24" width="8" height="8" fill="#f4ecdc" />
      <path d="M28 32h16l-4 12h-8z" fill="#d7e7ef" />
    </>
  ),
  jaxa: (
    <>
      <circle cx="36" cy="32" r="10" fill="none" stroke="#ff7a3c" strokeWidth="2" />
      <circle cx="36" cy="32" r="3" fill="#f4ecdc" />
      <path d="M36 16v6M36 42v6M20 32h6M46 32h6" stroke="#d7e7ef" strokeWidth="1.6" />
    </>
  ),
  isro: (
    <>
      <path d="M36 16l8 22H28z" fill="#ff7a3c" />
      <path d="M24 44h24" stroke="#f4ecdc" strokeWidth="2" />
      <circle cx="48" cy="22" r="2" fill="#d7e7ef" />
    </>
  ),
  esa: (
    <>
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index / 8) * Math.PI * 2
        const x = 36 + Math.cos(angle) * 14
        const y = 33 + Math.sin(angle) * 14
        return <circle key={index} cx={x} cy={y} r="1.7" fill="#f4ecdc" />
      })}
      <circle cx="36" cy="33" r="3" fill="#ff7a3c" />
    </>
  ),
  china: (
    <>
      <path d="M36 16l2.4 6.4H45l-5.2 4 2 6.4L36 29.2 30.2 32.8l2-6.4-5.2-4h6.6z" fill="#ff7a3c" />
      <path d="M24 46h24" stroke="#d7e7ef" strokeWidth="2" />
    </>
  ),
  generic: (
    <>
      <path d="M36 18l5 10h-10z" fill="#ff7a3c" />
      <rect x="33" y="28" width="6" height="12" fill="#f4ecdc" />
      <path d="M22 46h28" stroke="#8eafbe" strokeWidth="1.6" />
      <circle cx="50" cy="22" r="1.3" fill="#f4ecdc" />
    </>
  ),
}
