import { describe, expect, it } from 'vitest'
import { loadShareFonts } from '@/lib/share-fonts'

describe('share image fonts', () => {
  it('loads Gloock and Inclusive Sans from the bundled files', async () => {
    const fonts = await loadShareFonts()
    expect(fonts.gloock).not.toBeNull()
    expect(fonts.inclusive).not.toBeNull()
    expect(fonts.gloock!.byteLength).toBeGreaterThan(1000)
    expect(fonts.inclusive!.byteLength).toBeGreaterThan(1000)
  })
})
