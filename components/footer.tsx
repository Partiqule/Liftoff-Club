import Link from 'next/link'
import { PRO_COPY } from '@/lib/pro/copy'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          Launch times come from <a href="https://thespacedevs.com/llapi">The Space Devs Launch Library 2</a>. Orbits come from{' '}
          <a href="https://celestrak.org">CelesTrak</a>. Weather comes from <a href="https://open-meteo.com">Open-Meteo</a>. Pass times are a family estimate, not a number for flying anything.
        </p>
        <p>
          <Link href="/companies">Companies on the board</Link> are public pages with no owner and no login. <Link href="/glossary">Space words</Link> explain the calls on a countdown. <Link href="/history" prefetch={false}>History</Link> lists a few famous flights. <Link href="/events" prefetch={false}>Tests and events</Link> lists static fires and other public events. <Link href="/constellations" prefetch={false}>Constellations</Link> count what is in orbit. Rocket pictures are limited to public domain and Creative Commons licenses that allow commercial use.
        </p>
        <p>No ads. No accounts. Your town stays in this browser. Bedtime quiet hours apply to alerts, not to the countdown itself.</p>
        <p>
          <Link href="/pro" prefetch={false}>Liftoff Club Pro</Link> is a separate desk for space industry teams. The family site stays free. <Link href="/about/build" prefetch={false}>How it is built</Link>
          {' · '}
          <Link href="/privacy">Privacy</Link>
          {' · '}
          <Link href="/support">Support</Link>
        </p>
        <p>{PRO_COPY.footerLine}</p>
      </div>
    </footer>
  )
}
