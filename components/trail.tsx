export function Trail({
  glow = 'mid',
  span = 'inline',
}: {
  glow?: 'strong' | 'mid' | 'fade'
  span?: 'inline' | 'hero' | 'load'
}) {
  const wide = span === 'hero'
  return (
    <svg
      className={`trail trail-${span} light-${glow}`}
      viewBox={wide ? '0 0 1200 160' : '0 0 220 40'}
      aria-hidden="true"
    >
      <path
        d={wide ? 'M0 108C260 128 620 18 1172 46' : 'M4 32C52 32 78 8 214 10'}
        fill="none"
        stroke="currentColor"
        strokeWidth={wide ? 1.4 : 1.6}
        strokeLinecap="round"
      />
      <circle className="trail-head" cx={wide ? 1172 : 214} cy={wide ? 46 : 10} r={wide ? 5 : 2.4} fill="currentColor" />
    </svg>
  )
}
