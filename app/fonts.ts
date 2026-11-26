import localFont from 'next/font/local'

/** Titles. Latin only, preloaded, with a sized fallback so text can paint early. */
export const gloock = localFont({
  src: '../node_modules/@fontsource/gloock/files/gloock-latin-400-normal.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-gloock',
  adjustFontFallback: 'Times New Roman',
  preload: true,
  fallback: ['Iowan Old Style', 'Palatino', 'serif'],
})

/** Reading text. 400 and 500 are both on the first screen, so they preload. */
export const inclusive = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/inclusive-sans/files/inclusive-sans-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inclusive-sans/files/inclusive-sans-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-inclusive',
  adjustFontFallback: 'Arial',
  preload: true,
  fallback: ['Avenir Next', 'Segoe UI', 'sans-serif'],
})

/** Labels and figures. Loaded with the stylesheet, not ahead of the hero picture. */
export const barlow = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/barlow/files/barlow-latin-300-normal.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-barlow',
  adjustFontFallback: 'Arial',
  preload: false,
  fallback: ['Avenir Next', 'Segoe UI', 'sans-serif'],
})
