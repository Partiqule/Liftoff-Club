import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type ShareFonts = {
  gloock: Buffer | null
  inclusive: Buffer | null
}

const GLOOCK_URL = 'https://github.com/google/fonts/raw/main/ofl/gloock/Gloock-Regular.ttf'
const INCLUSIVE_URL = 'https://github.com/google/fonts/raw/main/ofl/inclusivesans/InclusiveSans%5Bwght%5D.ttf'

async function readFirst(files: string[]): Promise<Buffer | null> {
  for (const file of files) {
    try {
      const data = await readFile(file)
      if (data.byteLength > 1000) return data
    } catch {
      // The next location may still have the file.
    }
  }
  return null
}

async function fetchFont(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    const data = Buffer.from(await response.arrayBuffer())
    return data.byteLength > 1000 ? data : null
  } catch {
    return null
  }
}

/** Bundled TTF first, then the font package, then Google Fonts. Never throws. */
export async function loadShareFonts(): Promise<ShareFonts> {
  const root = process.cwd()
  let gloock = await readFirst([
    path.join(root, 'lib/fonts/Gloock-Regular.ttf'),
    path.join(root, 'node_modules/@fontsource/gloock/files/gloock-latin-400-normal.woff'),
  ])
  let inclusive = await readFirst([
    path.join(root, 'lib/fonts/InclusiveSans-Regular.ttf'),
    path.join(root, 'node_modules/@fontsource/inclusive-sans/files/inclusive-sans-latin-400-normal.woff'),
  ])
  if (!gloock) gloock = await fetchFont(GLOOCK_URL)
  if (!inclusive) inclusive = await fetchFont(INCLUSIVE_URL)
  return { gloock, inclusive }
}
