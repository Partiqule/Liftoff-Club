import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROCKET_PHOTOS, findRocketPhoto, licenseAllowed, rocketId } from '@/lib/rocket-photos'

describe('rocket photo licenses', () => {
  it('accepts public domain and commercial Creative Commons, and rejects the rest', () => {
    expect(licenseAllowed('Public domain')).toBe(true)
    expect(licenseAllowed('CC0')).toBe(true)
    expect(licenseAllowed('CC BY 4.0')).toBe(true)
    expect(licenseAllowed('CC BY-SA 4.0')).toBe(true)
    expect(licenseAllowed('CC BY 3.0 de')).toBe(true)
    expect(licenseAllowed('CC BY-NC 4.0')).toBe(false)
    expect(licenseAllowed('CC BY-NC-SA 4.0')).toBe(false)
    expect(licenseAllowed('CC BY-ND 4.0')).toBe(false)
    expect(licenseAllowed('')).toBe(false)
    expect(licenseAllowed('All rights reserved')).toBe(false)
  })

  it('ships only allowed photos, with a file on disk, and leaves the rest unmatched', () => {
    expect(ROCKET_PHOTOS.length).toBeGreaterThan(0)
    for (const photo of ROCKET_PHOTOS) {
      expect(licenseAllowed(photo.license)).toBe(true)
      expect(photo.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:')).toBe(true)
      expect(photo.author.trim().length).toBeGreaterThan(0)
      expect(existsSync(path.join(process.cwd(), 'public', photo.file))).toBe(true)
    }
    expect(findRocketPhoto('Falcon 9 Block 5')?.id).toBe('falcon-9')
    expect(findRocketPhoto('Long March 2D')).toBeNull()
    expect(rocketId('Electron')).toBe('electron')
    expect(rocketId('Long March 8A')).toBe('long-march-8a')
  })
})
