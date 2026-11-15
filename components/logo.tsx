export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M8 48C22 48 28 20 54 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M8 48C22 48 28 20 54 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="54" cy="14" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="wordmark">Liftoff Club</span>
}
