import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liftoff Club',
    short_name: 'Liftoff',
    description: 'A family companion for rocket launches and visible passes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#081018',
    theme_color: '#081018',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
