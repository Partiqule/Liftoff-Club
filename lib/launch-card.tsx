import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { loadShareFonts } from '@/lib/share-fonts'
import { formatLaunchWhen } from '@/lib/pro/time'

export const cardSize = { width: 1200, height: 630 }

export async function launchCard(launch: {
  name: string
  rocketName: string
  net: string | null
  precision: string | null
  statusName?: string | null
}) {
  const [logo, fonts] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/brand/logo-512.png')),
    loadShareFonts(),
  ])
  const src = `data:image/png;base64,${logo.toString('base64')}`
  const loaded = [
    fonts.gloock ? { name: 'Gloock', data: fonts.gloock, weight: 400 as const, style: 'normal' as const } : null,
    fonts.inclusive ? { name: 'Inclusive Sans', data: fonts.inclusive, weight: 400 as const, style: 'normal' as const } : null,
  ].filter((font) => font !== null)
  const when = formatLaunchWhen(launch.net, launch.precision, launch.statusName)
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
        gap: '48px',
      }}
    >
      <img src={src} width={220} height={220} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '760px' }}>
        <div style={{ display: 'flex', fontSize: 28, color: '#c5d2e2' }}>Liftoff Club</div>
        <div style={{ display: 'flex', fontFamily: 'Gloock', fontSize: 64, lineHeight: 1.05, marginTop: 16 }}>{launch.name}</div>
        <div style={{ display: 'flex', fontSize: 32, color: '#c5d2e2', marginTop: 18 }}>{launch.rocketName}</div>
        <div style={{ display: 'flex', fontSize: 32, marginTop: 12 }}>{when}</div>
      </div>
    </div>
  )
  const paint = (faces: typeof loaded) =>
    new ImageResponse(image, faces.length > 0 ? { ...cardSize, fonts: faces } : cardSize)
  try {
    if (loaded.length > 0) return paint(loaded)
  } catch {
    // A bad font file must not stop the card.
  }
  return paint([])
}
