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
      viewBox={wide ? '0 0 720 180' : '0 0 220 40'}
      aria-hidden="true"
    >
      <path
        d={wide ? 'M8 150C180 150 280 28 700 36' : 'M4 32C52 32 78 8 214 10'}
        fill="none"
        stroke="currentColor"
        strokeWidth={wide ? 1.4 : 1.6}
        strokeLinecap="round"
      />
      <circle className="trail-head" cx={wide ? 700 : 214} cy={wide ? 36 : 10} r={wide ? 3.2 : 2.4} fill="currentColor" />
    </svg>
  )
}
