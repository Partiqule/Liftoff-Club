import Link from 'next/link'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          Launch times come from <a href="https://thespacedevs.com/llapi">The Space Devs Launch Library 2</a>. Orbits come from{' '}
          <a href="https://celestrak.org">CelesTrak</a>. Weather comes from <a href="https://open-meteo.com">Open-Meteo</a>. Pass times are a family estimate, not a number for flying anything.
        </p>
        <p>
          <Link href="/companies">Companies on the board</Link> are public pages with no owner and no login.
        </p>
        <p>No ads. No accounts. Your town stays in this browser. Bedtime quiet hours apply to alerts, not to the countdown itself.</p>
      </div>
    </footer>
  )
}
