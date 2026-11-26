/**
 * Still frame of the home globe. Shown until that code loads.
 * The legend and credit match the live frame so the page does not jump.
 */
export function HomeGlobeFallback() {
  return (
    <section className="radar-hero wrap" aria-label="In orbit now">
      <p className="kicker">In orbit now</p>
      <div className="radar-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="radar-still"
          src="/earth/blue-marble-still.jpg"
          alt="Earth"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <p className="meta radar-gesture">Tap to explore</p>
      <p className="note">Drawing the Earth.</p>
      <p className="note">Checking saved orbits.</p>
      <ul className="radar-legend">
        <li>
          <i style={{ background: '#f3d7b0' }} />
          Stations
        </li>
        <li>
          <i style={{ background: '#b7aec8' }} />
          Starlink trains
        </li>
        <li>
          <i style={{ background: '#c5d2e2' }} />
          Bright satellites
        </li>
        <li>
          <i className="radar-you" />
          You
        </li>
      </ul>
      <p className="meta radar-path" aria-hidden="true">
        &nbsp;
      </p>
      <p className="meta">Tap a dot for a name, altitude, speed, and the next orbit.</p>
      <p className="meta">
        Earth image: NASA Blue Marble, public domain. Orbit data from <a href="https://celestrak.org">CelesTrak</a>.
      </p>
    </section>
  )
}
