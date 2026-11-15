export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="34" cy="18" rx="16" ry="10" fill="currentColor" opacity="0.28" />
      <ellipse cx="33" cy="17" rx="8" ry="5" fill="currentColor" opacity="0.7" />
      <path d="M20 24C16 36 22 46 14 58" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path d="M34 26C33 40 36 48 32 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M46 24C52 36 46 46 54 56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="wordmark">Liftoff Club</span>
}
