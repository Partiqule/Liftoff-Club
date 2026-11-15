import type { TrackPoint } from '@/lib/mission'

export type Vec = { x: number; y: number; z: number }

export type GlobeCamera = {
  lat: number
  lon: number
  xAxis: Vec
  yAxis: Vec
  zAxis: Vec
}

/** Look at the middle of the ground track so the pad and the far end can both sit on the disc. */
export function globeCamera(track: TrackPoint[]): GlobeCamera {
  const focus = trackFocus(track)
  const zAxis = unit(focus.lat, focus.lon)
  const north = { x: 0, y: 1, z: 0 }
  let east = cross(north, zAxis)
  if (Math.hypot(east.x, east.y, east.z) < 1e-6) east = { x: 1, y: 0, z: 0 }
  const xAxis = normalize(east)
  const yAxis = normalize(cross(zAxis, xAxis))
  return { lat: focus.lat, lon: focus.lon, xAxis, yAxis, zAxis }
}

export function cameraVector(point: { lat: number; lon: number }, camera: GlobeCamera): Vec {
  const place = unit(point.lat, point.lon)
  return {
    x: dot(place, camera.xAxis),
    y: dot(place, camera.yAxis),
    z: dot(place, camera.zAxis),
  }
}

/** Positive z faces the camera. The limb is z = 0. */
export function facing(point: { lat: number; lon: number }, camera: GlobeCamera): number {
  return cameraVector(point, camera).z
}

function trackFocus(track: TrackPoint[]): TrackPoint {
  if (track.length === 0) return { lat: 20, lon: -90 }
  const sum = track.reduce(
    (acc, point) => {
      const place = unit(point.lat, point.lon)
      return { x: acc.x + place.x, y: acc.y + place.y, z: acc.z + place.z }
    },
    { x: 0, y: 0, z: 0 },
  )
  if (Math.hypot(sum.x, sum.y, sum.z) < 1e-4) return track[Math.floor(track.length / 2)] ?? track[0]
  const toward = normalize(sum)
  return {
    lat: (Math.asin(Math.max(-1, Math.min(1, toward.y))) * 180) / Math.PI,
    lon: (Math.atan2(toward.x, toward.z) * 180) / Math.PI,
  }
}

function unit(lat: number, lon: number): Vec {
  const λ = (lon * Math.PI) / 180
  const φ = (lat * Math.PI) / 180
  return { x: Math.cos(φ) * Math.sin(λ), y: Math.sin(φ), z: Math.cos(φ) * Math.cos(λ) }
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function cross(a: Vec, b: Vec): Vec {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
}

function normalize(vec: Vec): Vec {
  const length = Math.hypot(vec.x, vec.y, vec.z) || 1
  return { x: vec.x / length, y: vec.y / length, z: vec.z / length }
}
