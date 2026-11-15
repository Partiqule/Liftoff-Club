export function Trail({ glow = 'mid' }: { glow?: 'strong' | 'mid' | 'fade' }) {
  return (
    <svg className={`trail light-${glow}`} viewBox="0 0 220 40" aria-hidden="true">
      <path d="M4 32C52 32 78 8 214 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle className="trail-head" cx="214" cy="10" r="2.4" fill="currentColor" />
    </svg>
  )
}
