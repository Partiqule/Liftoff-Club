import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Liftoff Club. Look up together.'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#07060f',
          color: '#f6f3ec',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, color: '#c5d2e2' }}>Look up together</div>
        <svg width="980" height="140" viewBox="0 0 980 140">
          <path d="M10 110C240 120 520 24 950 36" fill="none" stroke="#f3d7b0" strokeWidth="4" strokeLinecap="round" />
          <circle cx="950" cy="36" r="7" fill="#f3d7b0" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 72, lineHeight: 1 }}>Liftoff Club</div>
          <div style={{ display: 'flex', fontSize: 28, color: '#c5d2e2', marginTop: 16 }}>Launches and the night sky, for the kitchen table.</div>
        </div>
      </div>
    ),
    size,
  )
}
