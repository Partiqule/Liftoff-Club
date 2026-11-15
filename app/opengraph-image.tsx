import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
          background: '#081018',
          color: '#f4ecdc',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 8, color: '#ff7a3c' }}>LIFTOFF CLUB</div>
        <div style={{ display: 'flex', fontSize: 92, lineHeight: 0.95, maxWidth: 860 }}>The station rises tonight.</div>
        <div style={{ display: 'flex', fontSize: 30, color: '#d7e7ef' }}>A family companion for launches and the night sky.</div>
      </div>
    ),
    size,
  )
}
