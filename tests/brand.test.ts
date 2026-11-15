import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const files = [
  'public/brand/logo-original.jpg',
  'public/brand/logo-512.png',
  'public/brand/logo-192.png',
  'public/brand/apple-touch-icon.png',
  'public/brand/favicon-32.png',
  'public/brand/favicon-16.png',
  'public/brand/favicon.ico',
  'app/icon.png',
  'app/apple-icon.png',
  'app/favicon.ico',
]

describe('official mark', () => {
  it('keeps the original and the web sizes', () => {
    for (const file of files) {
      expect(existsSync(path.join(process.cwd(), file)), file).toBe(true)
    }
  })
})
