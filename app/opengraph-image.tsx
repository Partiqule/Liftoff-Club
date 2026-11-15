import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Liftoff Club. Look up together.'

export default async function OpenGraphImage() {
  const logo = await readFile(path.join(process.cwd(), 'public/brand/logo-512.png'))
  const src = `data:image/png;base64,${logo.toString('base64')}`
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#07060f',
          color: '#f6f3ec',
          padding: '72px',
          gap: '56px',
        }}
      >
        {/* The official mark, white matte already removed. */}
        <img src={src} width={440} height={440} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 32, color: '#c5d2e2' }}>Look up together</div>
          <div style={{ display: 'flex', fontSize: 84, lineHeight: 1, marginTop: 12 }}>Liftoff Club</div>
          <div style={{ display: 'flex', fontSize: 28, color: '#c5d2e2', marginTop: 20 }}>Launches and the night sky.</div>
        </div>
      </div>
    ),
    size,
  )
}
