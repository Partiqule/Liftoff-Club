import { useId } from 'react'

/** Translucent twilight plume. A bell of light and falling exhaust, not a character. */
export function Jellyfish({ size = 'hero' }: { size?: 'hero' | 'day' | 'load' | 'mark' }) {
  const raw = useId().replace(/:/g, '')
  const glow = `plume-${raw}`
  return (
    <svg className={`jelly jelly-${size}`} viewBox="0 0 360 520" aria-hidden="true">
      <defs>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="jelly-drift" filter={`url(#${glow})`}>
        <ellipse className="bell bell-outer" cx="180" cy="118" rx="140" ry="86" />
        <ellipse className="bell bell-veil" cx="180" cy="108" rx="108" ry="64" />
        <ellipse className="bell bell-mid" cx="176" cy="126" rx="86" ry="46" />
        <ellipse className="bell bell-core" cx="172" cy="108" rx="42" ry="24" />
        <path className="tendril" d="M64 150C42 250 96 340 28 490" />
        <path className="tendril tendril-slow" d="M112 168C96 280 140 360 86 512" />
        <path className="tendril tendril-core" d="M168 178C160 290 188 380 150 520" />
        <path className="tendril tendril-core tendril-slow" d="M198 176C210 300 186 390 214 516" />
        <path className="tendril tendril-slow" d="M248 166C270 286 230 370 286 508" />
        <path className="tendril" d="M300 148C332 250 286 346 340 478" />
      </g>
    </svg>
  )
}
