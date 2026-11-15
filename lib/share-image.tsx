import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { loadShareFonts } from '@/lib/share-fonts'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Liftoff Club. Look up together.'

export default async function renderShareImage() {
  const [logo, fonts] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/brand/logo-512.png')),
    loadShareFonts(),
  ])
  const src = `data:image/png;base64,${logo.toString('base64')}`
  const loaded = [
    fonts.gloock ? { name: 'Gloock', data: fonts.gloock, weight: 400 as const, style: 'normal' as const } : null,
    fonts.inclusive ? { name: 'Inclusive Sans', data: fonts.inclusive, weight: 400 as const, style: 'normal' as const } : null,
  ].filter((font) => font !== null)
  const image = (
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
      <img src={src} width={440} height={440} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontFamily: 'Inclusive Sans', fontSize: 32, color: '#c5d2e2' }}>Look up together</div>
        <div style={{ display: 'flex', fontFamily: 'Gloock', fontSize: 84, lineHeight: 1, marginTop: 12 }}>Liftoff Club</div>
        <div style={{ display: 'flex', fontFamily: 'Inclusive Sans', fontSize: 28, color: '#c5d2e2', marginTop: 20 }}>Launches and the night sky.</div>
      </div>
    </div>
  )
  async function paint(fonts: typeof loaded) {
    const response = new ImageResponse(image, fonts.length > 0 ? { ...size, fonts } : size)
    const bytes = await response.arrayBuffer()
    return new Response(bytes, { headers: { 'Content-Type': 'image/png' } })
  }
  try {
    if (loaded.length > 0) return await paint(loaded)
  } catch {
    // A bad font file must not stop the build. The picture still renders.
  }
  return paint([])
}
