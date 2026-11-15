/**
 * One club mark for every provider. It is a rising trail, not a star, an orbit badge, or a company logo.
 */
export function Patch({ provider, rocket }: { provider: string; rocket: string }) {
  return (
    <svg className="patch" viewBox="0 0 72 72" role="img" aria-label={`Liftoff Club mark for ${provider} ${rocket}`}>
      <circle cx="36" cy="36" r="34" fill="#100e1c" stroke="#c5d2e2" strokeWidth="1.2" />
      <path d="M24 50c6-4 10-14 12-30" fill="none" stroke="#f3d7b0" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="36" cy="20" r="2.2" fill="#f6f3ec" />
    </svg>
  )
}
