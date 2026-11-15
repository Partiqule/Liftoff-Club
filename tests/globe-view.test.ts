import { describe, expect, it } from 'vitest'
import { facing, globeCamera } from '@/lib/globe-view'
import { groundTrack } from '@/lib/mission'

describe('mission globe camera', () => {
  it('faces the middle of the path so the pad and the far end stay on the disc', () => {
    const track = groundTrack(28.5, -80.6, 90, 40, 3.2)
    const camera = globeCamera(track)
    const start = facing(track[0], camera)
    const end = facing(track[track.length - 1], camera)
    const middle = facing(track[Math.floor(track.length / 2)], camera)
    expect(middle).toBeGreaterThan(0.9)
    expect(start).toBeGreaterThan(-0.02)
    expect(end).toBeGreaterThan(-0.02)
    expect(Math.abs(camera.lat)).toBeLessThan(80)
    const full = groundTrack(28.5, -80.6, 90)
    const wide = globeCamera(full)
    expect(facing(full[0], wide)).toBeGreaterThan(-0.05)
    expect(facing(full[full.length - 1], wide)).toBeGreaterThan(-0.05)
  })
})
