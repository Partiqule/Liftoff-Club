'use client'

import { useEffect, useRef } from 'react'
import { subsolar } from '@/lib/mission'
import {
  EARTH_TEXTURE,
  RADAR_COPY,
  RADAR_HOME_VIEW,
  RADAR_K,
  viewLookingAt,
  ascentProgress,
  lerpFixes,
  projectRadar,
  spherePoint,
  type RadarFix,
  type RadarLaunch,
  type RadarView,
} from '@/lib/radar'
import { fixesAt, orbitTrack, prepareBodies, type RadarBody } from '@/lib/radar-propagate'
import type { SkyElement } from '@/lib/sky-point'

type Hit = { id: string; x: number; y: number; kind: RadarFix['kind'] }

const DOT: Record<RadarFix['kind'], string> = {
  station: '#f3d7b0',
  hubble: '#f6f3ec',
  bright: '#c5d2e2',
  starlink: '#b7aec8',
}

const RANK: Record<RadarFix['kind'], number> = { bright: 0, starlink: 1, hubble: 2, station: 3 }

type Props = {
  objects: SkyElement[]
  place: { lat: number; lon: number } | null
  launch: RadarLaunch | null
  reduced: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onFix: (fix: RadarFix | null) => void
  onLive: () => void
  onFallback: () => void
}

export function RadarScene(props: Props) {
  const propsRef = useRef(props)
  const wrapRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const wrap = wrapRef.current
    const glCanvas = glRef.current
    const over = overRef.current
    if (!wrap || !glCanvas || !over) return
    const gl = glCanvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      premultipliedAlpha: true,
    })
    if (!gl) {
      propsRef.current.onFallback()
      return
    }
    const program = buildProgram(gl)
    if (!program) {
      propsRef.current.onFallback()
      return
    }
    const mesh = buildSphere(gl, 32, 48)
    const texture = gl.createTexture()
    if (!texture) {
      propsRef.current.onFallback()
      return
    }
    let dead = false
    let textured = false
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (dead) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      textured = true
      propsRef.current.onLive()
    }
    image.onerror = () => {
      if (!dead) propsRef.current.onFallback()
    }
    image.src = EARTH_TEXTURE

    const overlay = over.getContext('2d')
    if (!overlay) {
      propsRef.current.onFallback()
      return
    }

    const opening = propsRef.current.launch
    const view: RadarView = opening ? viewLookingAt(opening.padLat, opening.padLon, 2.65) : { ...RADAR_HOME_VIEW }
    let bodies: RadarBody[] = []
    let prev: { at: number; fixes: RadarFix[] } | null = null
    let next: { at: number; fixes: RadarFix[] } | null = null
    let track: { lat: number; lon: number }[] = []
    let trackId: string | null = null
    const hits: Hit[] = []
    let paused = false
    let frame = 0
    let timer = 0
    let idle = 0
    const pointers = new Map<number, { x: number; y: number }>()
    let drag = { x: 0, y: 0, moved: 0, yaw: view.yaw, pitch: view.pitch }
    let pinch: { dist: number; distance: number } | null = null

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const css = Math.max(2, Math.min(rect.width, rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.max(2, Math.round(css * dpr))
      if (glCanvas.width !== px) {
        glCanvas.width = px
        glCanvas.height = px
        over.width = px
        over.height = px
      }
      gl.viewport(0, 0, glCanvas.width, glCanvas.height)
    }

    const recompute = () => {
      const fixes = fixesAt(bodies, new Date())
      const now = Date.now()
      prev = next
      next = { at: now, fixes }
      const selected = propsRef.current.selectedId
      propsRef.current.onFix(selected ? (fixes.find((fix) => fix.noradId === selected) ?? null) : null)
    }

    const shownFixes = () => {
      if (!next) return []
      if (!prev || next.at <= prev.at) return next.fixes
      const u = Math.min(1, (Date.now() - prev.at) / Math.max(1, next.at - prev.at))
      return lerpFixes(prev.fixes, next.fixes, u)
    }

    let signature = ''
    const syncBodies = () => {
      const nextSig = propsRef.current.objects.map((object) => object.noradId).join(',')
      if (nextSig === signature) return
      signature = nextSig
      bodies = prepareBodies(propsRef.current.objects)
      track = []
      trackId = null
      prev = null
      next = null
      recompute()
    }

    const draw = () => {
      syncBodies()
      const selected = propsRef.current.selectedId
      if (selected !== trackId) {
        const body = selected ? bodies.find((item) => item.noradId === selected) : undefined
        track = body ? orbitTrack(body, new Date()) : []
        trackId = selected
        recompute()
      }
      resize()
      const size = glCanvas.width
      if (!paused && !propsRef.current.reduced && pointers.size === 0 && Date.now() - idle > 1200) {
        view.yaw += 0.0008
      }
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (textured) {
        const sun = subsolar(Date.now())
        const aim = spherePoint(sun.lat, sun.lon)
        gl.useProgram(program.program)
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions)
        gl.enableVertexAttribArray(program.pos)
        gl.vertexAttribPointer(program.pos, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvs)
        gl.enableVertexAttribArray(program.uv)
        gl.vertexAttribPointer(program.uv, 2, gl.FLOAT, false, 0, 0)
        gl.uniform1f(program.yaw, view.yaw)
        gl.uniform1f(program.pitch, view.pitch)
        gl.uniform1f(program.dist, view.distance)
        gl.uniform1f(program.k, RADAR_K)
        gl.uniform3f(program.sun, aim.x, aim.y, aim.z)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(program.tex, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices)
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
      }
      overlay.clearRect(0, 0, size, size)
      hits.length = 0
      const launch = propsRef.current.launch
      if (launch) {
        const width = Math.max(2, size / 280)
        if (propsRef.current.reduced) {
          strokeChain(overlay, launch.track, view, size, '#f3d7b0', width)
        } else {
          const headCount = Math.max(1, Math.round(ascentProgress(Date.now(), false) * (launch.track.length - 1)))
          strokeChain(overlay, launch.track, view, size, 'rgba(243, 215, 176, 0.35)', Math.max(1.5, size / 420))
          strokeChain(overlay, launch.track.slice(0, headCount + 1), view, size, '#f3d7b0', width)
          const head = launch.track[Math.min(launch.track.length - 1, headCount)]
          const spot = head ? projectRadar(head.lat, head.lon, view, size) : null
          if (spot) {
            overlay.fillStyle = '#f6f3ec'
            overlay.beginPath()
            overlay.arc(spot.x, spot.y, Math.max(3.5, size / 140), 0, Math.PI * 2)
            overlay.fill()
          }
        }
        const pad = projectRadar(launch.padLat, launch.padLon, view, size)
        if (pad) diamond(overlay, pad.x, pad.y, Math.max(5, size / 90), '#f3d7b0')
      }
      if (track.length > 1) strokeChain(overlay, track, view, size, '#c5d2e2', Math.max(1.6, size / 360))
      const fixes = shownFixes()
      const ordered = fixes.slice().sort((a, b) => RANK[a.kind] - RANK[b.kind])
      for (const fix of ordered) {
        const spot = projectRadar(fix.lat, fix.lon, view, size)
        if (!spot) continue
        const selected = fix.noradId === propsRef.current.selectedId
        const radius = (fix.kind === 'station' ? 7 : fix.kind === 'hubble' ? 5.5 : 4) * (size / 700) * (selected ? 1.45 : 1)
        overlay.fillStyle = DOT[fix.kind]
        overlay.beginPath()
        overlay.arc(spot.x, spot.y, Math.max(2.2, radius), 0, Math.PI * 2)
        overlay.fill()
        hits.push({ id: fix.noradId, x: spot.x, y: spot.y, kind: fix.kind })
      }
      const you = propsRef.current.place
      if (you) {
        const spot = projectRadar(you.lat, you.lon, view, size)
        if (spot) {
          overlay.strokeStyle = '#f6f3ec'
          overlay.lineWidth = Math.max(1.5, size / 400)
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, Math.max(5, size / 80), 0, Math.PI * 2)
          overlay.stroke()
          overlay.fillStyle = '#f6f3ec'
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, Math.max(2, size / 180), 0, Math.PI * 2)
          overlay.fill()
        }
      }
    }

    const loop = () => {
      if (paused) return
      draw()
      frame = window.requestAnimationFrame(loop)
    }
    const start = () => {
      if (paused) return
      recompute()
      window.clearInterval(timer)
      timer = window.setInterval(recompute, 1000)
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(loop)
    }
    const stop = () => {
      window.clearInterval(timer)
      window.cancelAnimationFrame(frame)
    }
    const syncPause = () => {
      const hidden = document.visibilityState === 'hidden'
      const box = wrap.getBoundingClientRect()
      const off = box.bottom < 0 || box.top > window.innerHeight
      const should = hidden || off
      if (should === paused) return
      paused = should
      if (paused) {
        stop()
        prev = null
      } else start()
    }

    const pick = (cssX: number, cssY: number) => {
      const scale = over.width / Math.max(1, over.clientWidth)
      const x = cssX * scale
      const y = cssY * scale
      const reach = Math.max(14, over.width * 0.035)
      let closest = reach
      for (const hit of hits) closest = Math.min(closest, Math.hypot(hit.x - x, hit.y - y))
      let best: Hit | null = null
      let bestDist = reach
      for (const hit of hits) {
        const dist = Math.hypot(hit.x - x, hit.y - y)
        if (dist > reach || dist > closest + 6) continue
        if (!best || RANK[hit.kind] > RANK[best.kind] || (RANK[hit.kind] === RANK[best.kind] && dist < bestDist)) {
          best = hit
          bestDist = dist
        }
      }
      propsRef.current.onSelect(best ? best.id : null)
    }

    const onDown = (event: PointerEvent) => {
      try {
        over.setPointerCapture(event.pointerId)
      } catch {
        // The pointer can end before capture.
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      idle = Date.now()
      drag = { x: event.clientX, y: event.clientY, moved: 0, yaw: view.yaw, pitch: view.pitch }
      pinch = null
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, distance: view.distance }
      }
    }
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      idle = Date.now()
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
        view.distance = clamp(pinch.distance * (pinch.dist / dist), 1.7, 5.6)
        return
      }
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy))
      view.yaw = drag.yaw + dx * 0.005
      view.pitch = clamp(drag.pitch + dy * 0.005, -1.15, 1.15)
    }
    const onUp = (event: PointerEvent) => {
      const wasTap = pointers.size === 1 && drag.moved < 8
      pointers.delete(event.pointerId)
      if (wasTap) {
        const rect = over.getBoundingClientRect()
        pick(event.clientX - rect.left, event.clientY - rect.top)
      }
      if (pointers.size < 2) pinch = null
      idle = Date.now()
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      idle = Date.now()
      view.distance = clamp(view.distance * (event.deltaY > 0 ? 1.06 : 0.94), 1.7, 5.6)
    }
    const onKey = (event: KeyboardEvent) => {
      idle = Date.now()
      if (event.key === 'ArrowLeft') view.yaw += 0.08
      else if (event.key === 'ArrowRight') view.yaw -= 0.08
      else if (event.key === 'ArrowUp') view.pitch = clamp(view.pitch + 0.06, -1.15, 1.15)
      else if (event.key === 'ArrowDown') view.pitch = clamp(view.pitch - 0.06, -1.15, 1.15)
      else if (event.key === '+' || event.key === '=') view.distance = clamp(view.distance * 0.94, 1.7, 5.6)
      else if (event.key === '-' || event.key === '_') view.distance = clamp(view.distance * 1.06, 1.7, 5.6)
      else if (event.key === 'Escape') propsRef.current.onSelect(null)
      else return
      event.preventDefault()
    }
    const onLost = (event: Event) => {
      event.preventDefault()
      propsRef.current.onFallback()
    }

    resize()
    start()
    syncPause()
    const observer = new IntersectionObserver(syncPause, { threshold: 0.05 })
    observer.observe(wrap)
    document.addEventListener('visibilitychange', syncPause)
    over.addEventListener('pointerdown', onDown)
    over.addEventListener('pointermove', onMove)
    over.addEventListener('pointerup', onUp)
    over.addEventListener('pointercancel', onUp)
    over.addEventListener('wheel', onWheel, { passive: false })
    over.addEventListener('keydown', onKey)
    glCanvas.addEventListener('webglcontextlost', onLost)

    return () => {
      dead = true
      paused = true
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncPause)
      over.removeEventListener('pointerdown', onDown)
      over.removeEventListener('pointermove', onMove)
      over.removeEventListener('pointerup', onUp)
      over.removeEventListener('pointercancel', onUp)
      over.removeEventListener('wheel', onWheel)
      over.removeEventListener('keydown', onKey)
      glCanvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteTexture(texture)
      gl.deleteProgram(program.program)
      gl.deleteBuffer(mesh.positions)
      gl.deleteBuffer(mesh.uvs)
      gl.deleteBuffer(mesh.indices)
    }
  }, [])

  return (
    <div className="radar-live" ref={wrapRef}>
      <canvas ref={glRef} className="radar-gl" aria-hidden="true" />
      <canvas ref={overRef} className="radar-over" tabIndex={0} aria-label={RADAR_COPY.liveLabel} />
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function strokeChain(
  ctx: CanvasRenderingContext2D,
  points: { lat: number; lon: number }[],
  view: RadarView,
  size: number,
  color: string,
  width: number,
) {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  let open = false
  let prev: { x: number; y: number } | null = null
  for (const point of points) {
    const spot = projectRadar(point.lat, point.lon, view, size)
    if (!spot || (prev && Math.hypot(spot.x - prev.x, spot.y - prev.y) > size * 0.34)) {
      open = false
      prev = spot
      continue
    }
    if (!open) ctx.moveTo(spot.x, spot.y)
    else ctx.lineTo(spot.x, spot.y)
    open = true
    prev = spot
  }
  ctx.stroke()
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - radius)
  ctx.lineTo(x + radius * 0.72, y)
  ctx.lineTo(x, y + radius)
  ctx.lineTo(x - radius * 0.72, y)
  ctx.closePath()
  ctx.fill()
}

function buildProgram(gl: WebGLRenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  if (!vertex || !fragment) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'aPos')
  gl.bindAttribLocation(program, 1, 'aUv')
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return {
    program,
    pos: 0,
    uv: 1,
    yaw: gl.getUniformLocation(program, 'uYaw'),
    pitch: gl.getUniformLocation(program, 'uPitch'),
    dist: gl.getUniformLocation(program, 'uDist'),
    k: gl.getUniformLocation(program, 'uK'),
    sun: gl.getUniformLocation(program, 'uSun'),
    tex: gl.getUniformLocation(program, 'uTex'),
  }
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function buildSphere(gl: WebGLRenderingContext, stacks: number, slices: number) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let y = 0; y <= stacks; y += 1) {
    const lat = 90 - (y / stacks) * 180
    const v = 1 - y / stacks
    for (let x = 0; x <= slices; x += 1) {
      const lon = -180 + (x / slices) * 360
      const point = spherePoint(lat, lon)
      positions.push(point.x, point.y, point.z)
      uvs.push(x / slices, v)
    }
  }
  const row = slices + 1
  for (let y = 0; y < stacks; y += 1) {
    for (let x = 0; x < slices; x += 1) {
      const a = y * row + x
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
    }
  }
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
  const uvBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)
  const indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
  return { positions: positionBuffer, uvs: uvBuffer, indices: indexBuffer, count: indices.length }
}

const VERTEX = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform float uYaw;
uniform float uPitch;
uniform float uDist;
uniform float uK;
varying vec2 vUv;
varying vec3 vObj;
vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
vec3 rotX(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}
void main() {
  vUv = aUv;
  vObj = aPos;
  vec3 p = rotX(rotY(aPos, uYaw), uPitch);
  float w = uDist - p.z;
  gl_Position = vec4(p.x * uK / w, p.y * uK / w, 0.0, 1.0);
}
`

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
uniform vec3 uSun;
varying vec2 vUv;
varying vec3 vObj;
void main() {
  float light = dot(normalize(vObj), normalize(uSun));
  float shade = 0.5 + 0.5 * clamp(light, 0.0, 1.0);
  gl_FragColor = vec4(texture2D(uTex, vUv).rgb * shade, 1.0);
}
`
