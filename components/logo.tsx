export function Logo() {
  return (
    // The mark is Paul's illustration. A traced SVG would change it, so the header uses the transparent PNG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="logo-mark"
      src="/brand/logo-64.webp"
      srcSet="/brand/logo-64.webp 64w, /brand/logo-128.webp 128w"
      sizes="40px"
      width={40}
      height={40}
      alt=""
    />
  )
}

export function Wordmark() {
  return <span className="wordmark">Liftoff Club</span>
}
