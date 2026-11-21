import { describe, expect, it } from 'vitest'
import { placeLabels, type LabelObstacle } from '@/lib/globe-labels'

describe('globe label placement', () => {
  it('moves words off the mark, the Moon, and the path, and stays in the frame', () => {
    const obstacles: LabelObstacle[] = [
      { kind: 'disc', x: 80, y: 200, r: 8 },
      { kind: 'disc', x: 280, y: 180, r: 22 },
      { kind: 'seg', x1: 40, y1: 210, x2: 320, y2: 190 },
    ]
    const placed = placeLabels(
      [
        { id: 'launch', anchor: { x: 80, y: 200 }, w: 52, h: 16, prefer: 'left' },
        { id: 'tli', anchor: { x: 160, y: 200 }, w: 110, h: 16, prefer: 'down' },
        { id: 'behind', anchor: { x: 300, y: 180 }, w: 120, h: 16, prefer: 'right' },
      ],
      obstacles,
      { w: 400, h: 400 },
    )
    const launch = placed.find((item) => item.id === 'launch')
    const tli = placed.find((item) => item.id === 'tli')
    const behind = placed.find((item) => item.id === 'behind')
    expect(Math.hypot((launch?.x ?? 0) - 80, (launch?.y ?? 0) - 200)).toBeGreaterThan(20)
    expect(Math.hypot((behind?.x ?? 0) - 280, (behind?.y ?? 0) - 180)).toBeGreaterThan(30)
    expect(Math.abs((tli?.y ?? 0) - 200)).toBeGreaterThan(14)
    for (const item of placed) {
      expect(item.x).toBeGreaterThan(20)
      expect(item.x).toBeLessThan(380)
      expect(item.y).toBeGreaterThan(8)
      expect(item.y).toBeLessThan(392)
    }
  })

  it('keeps a wide label off the Earth after the frame pulls it back in', () => {
    const placed = placeLabels(
      [{ id: 'tli', anchor: { x: 278, y: 200 }, w: 130, h: 16, prefer: 'left' }],
      [
        { kind: 'disc', x: 200, y: 200, r: 72 },
        { kind: 'seg', x1: 130, y1: 200, x2: 330, y2: 200 },
      ],
      { w: 400, h: 400 },
    )
    const tli = placed[0]
    const nearestX = Math.max(tli.x - 65, Math.min(200, tli.x + 65))
    const nearestY = Math.max(tli.y - 8, Math.min(200, tli.y + 8))
    expect(Math.hypot(nearestX - 200, nearestY - 200)).toBeGreaterThan(76)
    expect(Math.abs(tli.y - 200)).toBeGreaterThan(16)
    expect(tli.x).toBeGreaterThan(70)
    expect(tli.x).toBeLessThan(330)
  })
})
