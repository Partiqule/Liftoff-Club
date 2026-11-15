export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#101a24" stroke="#ff7a3c" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="#f4ecdc" strokeWidth="1" strokeDasharray="2 2.2" opacity="0.75" />
      <path d="M16 44c6-3 10-3 16 0s10 3 16 0" fill="none" stroke="#8eafbe" strokeWidth="1.3" />
      <path d="M32 14l5.2 10.2h-10.4L32 14z" fill="#ff7a3c" />
      <rect x="28.2" y="24" width="7.6" height="14.5" rx="1.2" fill="#f4ecdc" />
      <circle cx="32" cy="29.2" r="1.5" fill="#101a24" />
      <path d="M28.2 34.5 23.2 41h5zM35.8 34.5 40.8 41h-5z" fill="#ff7a3c" />
      <path d="M30.2 38.4h3.6L32 44.2z" fill="#ffb089" />
      <circle cx="18" cy="20" r="1.05" fill="#f4ecdc" />
      <circle cx="47" cy="18" r="0.8" fill="#f4ecdc" />
      <circle cx="46.5" cy="28" r="0.7" fill="#d7e7ef" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-name">Liftoff</span>
      <span className="wordmark-club">Club</span>
    </span>
  )
}
