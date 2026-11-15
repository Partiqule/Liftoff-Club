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
          background: '#07060f',
          color: '#f6f3ec',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, color: '#f3d7b0' }}>Liftoff Club</div>
        <div style={{ display: 'flex', fontSize: 84, lineHeight: 1, maxWidth: 860 }}>The station rises tonight.</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#c5d2e2' }}>A family companion for launches and the night sky.</div>
      </div>
    ),
    size,
  )
}
