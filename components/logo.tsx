export function Logo({ size = 52 }: { size?: number }) {
  return (
    // The mark is Paul's illustration. A traced SVG would change it, so the header uses the transparent PNG.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="logo-mark" src="/brand/logo-512.png" width={size} height={size} alt="" />
  )
}

export function Wordmark() {
  return <span className="wordmark">Liftoff Club</span>
}
