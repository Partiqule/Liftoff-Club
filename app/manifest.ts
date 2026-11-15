import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liftoff Club',
    short_name: 'Liftoff',
    description: 'A family companion for rocket launches and visible passes.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07060f',
    theme_color: '#07060f',
    categories: ['news', 'education'],
    icons: [
      { src: '/brand/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/logo-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
