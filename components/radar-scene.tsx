'use client'

import { useEffect, useRef } from 'react'
import { subsolar } from '@/lib/mission'
import {
  EARTH_TEXTURE,
  RADAR_COPY,
  RADAR_K,
  clampDistance,
  clampPitch,
  dampVelocity,
  doubleTapDistance,
  dragFollow,
  easeView,
  gestureIntent,
  globeRadiusPx,
  latLonAt,
  launchPhase,
  lerpFixes,
  lookUnderFinger,
  openingView,
  pathCaption,
  projectRadar,
  spherePoint,
  velocityFromSamples,
  viewLookingAt,
  wheelDistance,
  type RadarFix,
  type RadarLaunch,
  type RadarOverlay,
  type RadarTarget,
  type RadarView,
} from '@/lib/radar'
import { fixesAt, orbitTrack, prepareBodies, type RadarBody } from '@/lib/radar-propagate'
import type { SkyElement } from '@/lib/sky-point'

type Hit = { target: RadarTarget; x: number; y: number; rank: number }

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
  timeZone: string | null
  launch: RadarLaunch | null
  reduced: boolean
  selected: RadarTarget | null
  onSelect: (target: RadarTarget | null) => void
  onFix: (fix: RadarFix | null) => void
  onLive: () => void
  onFallback: () => void
  overlay?: RadarOverlay | null
  focus?: { lat: number; lon: number } | null
  distance?: number
  ariaLabel?: string
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
      antialias: true,
      depth: true,
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
    const mesh = buildSphere(gl, 48, 64)
    const texture = gl.createTexture()
    if (!texture) {
      propsRef.current.onFallback()
      return
    }
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.disable(gl.BLEND)

    let dead = false
    let textured = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      if (dead) return
      const source = fitTexture(gl, image)
      gl.getError()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      const pot = isPowerOfTwo(source.width) && isPowerOfTwo(source.height)
      if (pot) {
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      }
      if (gl.getError() !== gl.NO_ERROR) {
        propsRef.current.onFallback()
        return
      }
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

    const view: RadarView = openingView({
      place: propsRef.current.place,
      timeZone: propsRef.current.timeZone,
      launch: propsRef.current.launch,
      focus: propsRef.current.focus,
      distance: propsRef.current.distance,
    })
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
    let userMoved = false
    let gesture: 'idle' | 'undecided' | 'scroll' | 'turn' | 'pinch' = 'idle'
    let activePointer: number | null = null
    let grab: { lat: number; lon: number } | null = null
    let pinch: { dist: number; distance: number; grab: { lat: number; lon: number } | null } | null = null
    let vel = { yaw: 0, pitch: 0 }
    let ease: { from: RadarView; to: RadarView; start: number; dur: number } | null = null
    let moved = 0
    let downAt = { x: 0, y: 0 }
    let lastDraw = performance.now()
    let traceOrigin = -1
    let lastTap: { t: number; x: number; y: number } | null = null
    let tapTimer = 0
    let holdTimer = 0
    const samples: { t: number; yaw: number; pitch: number }[] = []
    const pointers = new Map<number, { x: number; y: number }>()

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

    const canvasPoint = (clientX: number, clientY: number) => {
      const rect = over.getBoundingClientRect()
      const scaleX = over.width / Math.max(1, rect.width)
      const scaleY = over.height / Math.max(1, rect.height)
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
    }

    const recompute = () => {
      const fixes = fixesAt(bodies, new Date())
      const now = Date.now()
      prev = next
      next = { at: now, fixes }
      const selected = propsRef.current.selected
      const id = selected?.type === 'sat' ? selected.id : null
      propsRef.current.onFix(id ? (fixes.find((fix) => fix.noradId === id) ?? null) : null)
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

    const framedOpening = () =>
      openingView({
        place: propsRef.current.place,
        timeZone: propsRef.current.timeZone,
        launch: propsRef.current.launch,
        focus: propsRef.current.focus,
        distance: propsRef.current.distance,
      })

    const assignView = (next: RadarView) => {
      view.yaw = next.yaw
      view.pitch = next.pitch
      view.distance = next.distance
    }

    const startEase = (to: RadarView, dur = 440) => {
      if (propsRef.current.reduced) {
        assignView(to)
        ease = null
        return
      }
      ease = { from: { yaw: view.yaw, pitch: view.pitch, distance: view.distance }, to, start: performance.now(), dur }
    }

    const stopMotion = () => {
      vel = { yaw: 0, pitch: 0 }
      samples.length = 0
    }

    const draw = () => {
      syncBodies()
      const nowMs = performance.now()
      const dt = Math.min(34, Math.max(0, nowMs - lastDraw))
      lastDraw = nowMs
      if (ease && pointers.size === 0 && gesture !== 'turn' && gesture !== 'pinch') {
        const u = Math.min(1, (nowMs - ease.start) / ease.dur)
        assignView(easeView(ease.from, ease.to, u))
        if (u >= 1) ease = null
      } else if (!userMoved && gesture !== 'turn' && gesture !== 'pinch') {
        const framed = framedOpening()
        const gap = Math.hypot(framed.yaw - view.yaw, framed.pitch - view.pitch) + Math.abs(framed.distance - view.distance)
        if (gap > 0.04) startEase(framed, 520)
        else assignView(framed)
      } else if (pointers.size === 0 && gesture !== 'pinch' && gesture !== 'turn') {
        if (Math.hypot(vel.yaw, vel.pitch) > 1e-6) {
          view.yaw += vel.yaw * dt
          const nextPitch = view.pitch + vel.pitch * dt
          view.pitch = clampPitch(nextPitch)
          if (view.pitch !== nextPitch) vel.pitch = 0
          vel = { yaw: dampVelocity(vel.yaw, dt), pitch: dampVelocity(vel.pitch, dt) }
          if (Math.hypot(vel.yaw, vel.pitch) < 2e-6) vel = { yaw: 0, pitch: 0 }
          idle = Date.now()
        }
      }
      const selected = propsRef.current.selected
      const selectedId = selected?.type === 'sat' ? selected.id : null
      if (selectedId !== trackId) {
        const body = selectedId ? bodies.find((item) => item.noradId === selectedId) : undefined
        track = body ? orbitTrack(body, new Date()) : []
        trackId = selectedId
        recompute()
      }
      resize()
      const size = glCanvas.width
      if (!paused && !ease && !propsRef.current.reduced && pointers.size === 0 && gesture !== 'pinch' && gesture !== 'turn' && Date.now() - idle > 1600) {
        if (Math.hypot(vel.yaw, vel.pitch) < 2e-6) view.yaw += 0.0000375 * dt
      }
      gl.clearColor(0, 0, 0, 0)
      gl.clearDepth(1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
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
      const phase = launch ? launchPhase(launch, Date.now()) : 'flown'
      const caption = launch && phase !== 'flown' ? pathCaption(launch, phase) : null
      if (launch && phase !== 'flown') {
        const width = Math.max(2, size / 280)
        strokeChain(overlay, launch.track, view, size, '#f3d7b0', width)
        const pad = projectRadar(launch.padLat, launch.padLon, view, size)
        if (pad) {
          diamond(overlay, pad.x, pad.y, Math.max(6, size / 80), '#f3d7b0')
          hits.push({ target: { type: 'pad' }, x: pad.x, y: pad.y, rank: 5 })
          if (caption) {
            overlay.font = `${Math.max(13, size / 34)}px Barlow, sans-serif`
            overlay.fillStyle = '#f6f3ec'
            overlay.textAlign = 'left'
            overlay.textBaseline = 'bottom'
            overlay.fillText(caption, pad.x + size / 28, pad.y - size / 11)
          }
        }
      }
      if (track.length > 1) strokeChain(overlay, track, view, size, '#c5d2e2', Math.max(1.6, size / 360))
      const pattern = propsRef.current.overlay
      if (pattern) {
        const width = Math.max(2, size / 280)
        if (pattern.traceMs && traceOrigin < 0) traceOrigin = nowMs
        const trace = !propsRef.current.reduced && pattern.traceMs && pattern.traceMs > 0 ? Math.min(1, (nowMs - traceOrigin) / pattern.traceMs) : 1
        const total = pattern.chains.reduce((sum, chain) => sum + Math.max(0, chain.points.length - 1), 0) || 1
        let budget = trace * total
        for (const chain of pattern.chains) {
          const span = Math.max(0, chain.points.length - 1)
          const take = trace >= 1 ? chain.points.length : Math.min(chain.points.length, Math.floor(budget) + 1)
          if (take > 1) strokeChain(overlay, chain.points.slice(0, take), view, size, chain.color, width)
          budget -= span
        }
        for (const mark of pattern.marks) {
          const spot = projectRadar(mark.lat, mark.lon, view, size, mark.radius ?? 1)
          if (!spot) continue
          const chosen = selected?.type === 'orbit' && selected.id === mark.id
          const radius = Math.max(4, size / 90) * (chosen ? 1.4 : 1)
          if (mark.shape === 'moon') {
            const earthR = globeRadiusPx(size, view.distance)
            const body = Math.max(8, earthR * 0.2)
            overlay.fillStyle = '#d9d3c7'
            overlay.beginPath()
            overlay.arc(spot.x, spot.y, body, 0, Math.PI * 2)
            overlay.fill()
            overlay.strokeStyle = '#f6f3ec'
            overlay.lineWidth = Math.max(1.25, size / 500)
            overlay.stroke()
            overlay.font = `${Math.max(14, size / 26)}px Barlow, sans-serif`
            overlay.fillStyle = '#f6f3ec'
            overlay.textAlign = 'center'
            overlay.textBaseline = 'bottom'
            overlay.fillText('Moon', spot.x, Math.max(16, spot.y - body - size / 50))
            hits.push({ target: { type: 'orbit', id: mark.id }, x: spot.x, y: spot.y, rank: 7 })
            continue
          }
          if (mark.shape === 'diamond') {
            diamond(overlay, spot.x, spot.y, radius, '#f3d7b0')
          } else {
            overlay.strokeStyle = '#f6f3ec'
            overlay.lineWidth = Math.max(1.5, size / 420)
            overlay.beginPath()
            overlay.arc(spot.x, spot.y, radius, 0, Math.PI * 2)
            overlay.stroke()
            overlay.fillStyle = '#f3d7b0'
            overlay.beginPath()
            overlay.arc(spot.x, spot.y, Math.max(2, radius * 0.35), 0, Math.PI * 2)
            overlay.fill()
          }
          hits.push({ target: { type: 'orbit', id: mark.id }, x: spot.x, y: spot.y, rank: 6 })
          if (mark.canvas) labelOutward(overlay, spot.x, spot.y, radius + 4, size, mark.canvas, mark.side)
        }
      }
      const fixes = shownFixes()
      const ordered = fixes.slice().sort((a, b) => RANK[a.kind] - RANK[b.kind])
      for (const fix of ordered) {
        const spot = projectRadar(fix.lat, fix.lon, view, size)
        if (!spot) continue
        const chosen = selected?.type === 'sat' && fix.noradId === selected.id
        const radius = (fix.kind === 'station' ? 7 : fix.kind === 'hubble' ? 5.5 : 4) * (size / 700) * (chosen ? 1.45 : 1)
        overlay.fillStyle = DOT[fix.kind]
        overlay.beginPath()
        overlay.arc(spot.x, spot.y, Math.max(2.4, radius), 0, Math.PI * 2)
        overlay.fill()
        hits.push({ target: { type: 'sat', id: fix.noradId }, x: spot.x, y: spot.y, rank: 2 + RANK[fix.kind] })
      }
      const you = propsRef.current.place
      if (you) {
        const spot = projectRadar(you.lat, you.lon, view, size)
        if (spot) {
          overlay.strokeStyle = '#f6f3ec'
          overlay.lineWidth = Math.max(1.5, size / 400)
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, Math.max(6, size / 70), 0, Math.PI * 2)
          overlay.stroke()
          overlay.fillStyle = '#f6f3ec'
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, Math.max(2.2, size / 170), 0, Math.PI * 2)
          overlay.fill()
          hits.push({ target: { type: 'you' }, x: spot.x, y: spot.y, rank: 4 })
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

    const pick = (pixelX: number, pixelY: number) => {
      const reach = Math.max(44 * (over.width / Math.max(1, over.clientWidth)), over.width * 0.07)
      let best: Hit | null = null
      let bestDist = reach
      for (const hit of hits) {
        const dist = Math.hypot(hit.x - pixelX, hit.y - pixelY)
        if (dist > reach) continue
        if (!best || hit.rank > best.rank || (hit.rank === best.rank && dist < bestDist)) {
          best = hit
          bestDist = dist
        }
      }
      const launch = propsRef.current.launch
      const phase = launch ? launchPhase(launch, Date.now()) : 'flown'
      if (!best && launch && phase !== 'flown') {
        const along = chainDistance(pixelX, pixelY, launch.track, view, over.width)
        if (along <= reach) {
          propsRef.current.onSelect({ type: 'path' })
          return
        }
      }
      const pattern = propsRef.current.overlay
      if (!best && pattern) {
        let chainId: string | null = null
        let chainDist = reach
        for (const chain of pattern.chains) {
          const along = chainDistance(pixelX, pixelY, chain.points, view, over.width)
          if (along <= chainDist) {
            chainId = chain.id
            chainDist = along
          }
        }
        if (chainId) {
          propsRef.current.onSelect({ type: 'orbit', id: chainId })
          return
        }
        if (latLonAt(pixelX, pixelY, view, over.width)) {
          propsRef.current.onSelect({ type: 'earth' })
          return
        }
      }
      propsRef.current.onSelect(best ? best.target : null)
    }

    const rememberSample = () => {
      const t = performance.now()
      samples.push({ t, yaw: view.yaw, pitch: view.pitch })
      const cutoff = t - 90
      while (samples.length > 1 && samples[0].t < cutoff) samples.shift()
    }

    const lockTurn = (point: { x: number; y: number }, pointerId: number) => {
      gesture = 'turn'
      userMoved = true
      ease = null
      stopMotion()
      grab = latLonAt(point.x, point.y, view, over.width) ?? propsRef.current.place
      rememberSample()
      try {
        over.setPointerCapture(pointerId)
      } catch {
        // The pointer can end before capture.
      }
    }

    const beginPinch = () => {
      if (pointers.size < 2) return
      const [a, b] = [...pointers.values()]
      const mid = canvasPoint((a.x + b.x) / 2, (a.y + b.y) / 2)
      gesture = 'pinch'
      grab = null
      ease = null
      stopMotion()
      userMoved = true
      window.clearTimeout(holdTimer)
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        distance: view.distance,
        grab: latLonAt(mid.x, mid.y, view, over.width),
      }
    }

    const applyPinch = () => {
      if (!pinch || pointers.size < 2) return
      const [a, b] = [...pointers.values()]
      const mid = canvasPoint((a.x + b.x) / 2, (a.y + b.y) / 2)
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      assignView(lookUnderFinger(view, pinch.grab, mid.x, mid.y, over.width, pinch.distance * (pinch.dist / dist)))
      idle = Date.now()
    }

    const zoomFromTap = (point: { x: number; y: number }) => {
      const home = framedOpening()
      const decision = doubleTapDistance(view.distance, home.distance)
      const spot = latLonAt(point.x, point.y, view, over.width)
      const target = decision.recenter || !spot ? home : viewLookingAt(spot.lat, spot.lon, decision.distance)
      userMoved = true
      stopMotion()
      startEase(target, 420)
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const point = canvasPoint(event.clientX, event.clientY)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      stopMotion()
      if (pointers.size >= 2) {
        beginPinch()
        return
      }
      activePointer = event.pointerId
      downAt = point
      moved = 0
      idle = Date.now()
      const radius = globeRadiusPx(over.width, view.distance)
      const center = over.width / 2
      const inside = Math.hypot(point.x - center, point.y - center) <= radius
      window.clearTimeout(holdTimer)
      if (event.pointerType === 'mouse') {
        gesture = inside ? 'turn' : 'scroll'
        if (gesture === 'turn') lockTurn(point, event.pointerId)
        return
      }
      gesture = inside ? 'undecided' : 'scroll'
      if (gesture !== 'undecided') return
      holdTimer = window.setTimeout(() => {
        if (gesture === 'undecided' && activePointer === event.pointerId) lockTurn(downAt, event.pointerId)
      }, 200)
    }
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size >= 2 || gesture === 'pinch') {
        applyPinch()
        return
      }
      if (event.pointerId !== activePointer || gesture === 'scroll') return
      const point = canvasPoint(event.clientX, event.clientY)
      const dx = point.x - downAt.x
      const dy = point.y - downAt.y
      moved = Math.max(moved, Math.hypot(dx, dy))
      if (gesture === 'undecided') {
        const intent = gestureIntent(dx, dy, moved)
        if (intent === 'undecided') return
        window.clearTimeout(holdTimer)
        if (intent === 'scroll') {
          gesture = 'scroll'
          grab = null
          return
        }
        lockTurn(point, event.pointerId)
        return
      }
      if (gesture !== 'turn' || !grab) return
      const followed = dragFollow(view, grab, point.x, point.y, over.width)
      view.yaw = followed.yaw
      view.pitch = followed.pitch
      rememberSample()
      idle = performance.now()
    }
    const onUp = (event: PointerEvent) => {
      const point = canvasPoint(event.clientX, event.clientY)
      const wasTap = pointers.size <= 1 && gesture !== 'scroll' && gesture !== 'pinch' && moved < 12
      const wasTurn = gesture === 'turn' && moved >= 12
      pointers.delete(event.pointerId)
      window.clearTimeout(holdTimer)
      if (wasTap) {
        const now = performance.now()
        if (lastTap && now - lastTap.t < 300 && Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < 36) {
          window.clearTimeout(tapTimer)
          lastTap = null
          zoomFromTap(point)
        } else {
          lastTap = { t: now, x: point.x, y: point.y }
          const tapPoint = { x: point.x, y: point.y }
          window.clearTimeout(tapTimer)
          tapTimer = window.setTimeout(() => {
            pick(tapPoint.x, tapPoint.y)
            lastTap = null
          }, 280)
        }
      }
      if (propsRef.current.reduced || !wasTurn) vel = { yaw: 0, pitch: 0 }
      else vel = velocityFromSamples(samples)
      samples.length = 0
      if (pointers.size < 2) {
        pinch = null
        if (gesture === 'pinch') gesture = 'idle'
      }
      if (event.pointerId === activePointer) {
        activePointer = null
        grab = null
        if (gesture !== 'pinch') gesture = 'idle'
      }
      idle = Date.now()
    }
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) return
      event.preventDefault()
      if (!pinch) beginPinch()
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault()
        applyPinch()
        return
      }
      if (gesture === 'turn') event.preventDefault()
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const point = canvasPoint(event.clientX, event.clientY)
      const grabbed = latLonAt(point.x, point.y, view, over.width)
      userMoved = true
      ease = null
      stopMotion()
      idle = Date.now()
      assignView(lookUnderFinger(view, grabbed, point.x, point.y, over.width, wheelDistance(view.distance, event.deltaY, event.deltaMode)))
    }
    const onKey = (event: KeyboardEvent) => {
      userMoved = true
      idle = Date.now()
      ease = null
      stopMotion()
      if (event.key === 'ArrowLeft') view.yaw += 0.08
      else if (event.key === 'ArrowRight') view.yaw -= 0.08
      else if (event.key === 'ArrowUp') view.pitch = clampPitch(view.pitch + 0.06)
      else if (event.key === 'ArrowDown') view.pitch = clampPitch(view.pitch - 0.06)
      else if (event.key === '+' || event.key === '=') view.distance = clampDistance(view.distance * 0.94)
      else if (event.key === '-' || event.key === '_') view.distance = clampDistance(view.distance * 1.06)
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
    over.addEventListener('touchstart', onTouchStart, { passive: false })
    over.addEventListener('touchmove', onTouchMove, { passive: false })
    over.addEventListener('wheel', onWheel, { passive: false })
    over.addEventListener('keydown', onKey)
    glCanvas.addEventListener('webglcontextlost', onLost)

    return () => {
      dead = true
      paused = true
      window.clearTimeout(tapTimer)
      window.clearTimeout(holdTimer)
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncPause)
      over.removeEventListener('pointerdown', onDown)
      over.removeEventListener('pointermove', onMove)
      over.removeEventListener('pointerup', onUp)
      over.removeEventListener('pointercancel', onUp)
      over.removeEventListener('touchstart', onTouchStart)
      over.removeEventListener('touchmove', onTouchMove)
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
      <canvas ref={overRef} className="radar-over" tabIndex={0} aria-label={props.ariaLabel ?? RADAR_COPY.liveLabel} />
    </div>
  )
}

function fitTexture(gl: WebGLRenderingContext, image: HTMLImageElement): HTMLImageElement | HTMLCanvasElement {
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (width > 0 && height > 0 && width <= max && height <= max && isPowerOfTwo(width) && isPowerOfTwo(height)) return image
  const canvas = document.createElement('canvas')
  const limit = Math.min(max, 2048)
  const scale = Math.min(1, limit / Math.max(width, height, 1))
  canvas.width = potFloor(Math.max(2, Math.round(width * scale)))
  canvas.height = potFloor(Math.max(2, Math.round(height * scale)))
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function potFloor(value: number): number {
  let pot = 1
  while (pot * 2 <= value) pot *= 2
  return pot
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0
}

function chainDistance(
  x: number,
  y: number,
  points: { lat: number; lon: number; radius?: number }[],
  view: RadarView,
  size: number,
): number {
  let best = Number.POSITIVE_INFINITY
  let prev: { x: number; y: number } | null = null
  for (const point of points) {
    const spot = projectRadar(point.lat, point.lon, view, size, point.radius ?? 1)
    if (!spot || (prev && Math.hypot(spot.x - prev.x, spot.y - prev.y) > size * 0.34)) {
      prev = spot
      continue
    }
    if (prev) best = Math.min(best, segmentDistance(x, y, prev, spot))
    prev = spot
  }
  return best
}

function segmentDistance(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / len))
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t))
}

function strokeChain(
  ctx: CanvasRenderingContext2D,
  points: { lat: number; lon: number; radius?: number }[],
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
    const spot = projectRadar(point.lat, point.lon, view, size, point.radius ?? 1)
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

function labelOutward(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pad: number,
  size: number,
  text: string,
  side?: 'up' | 'down' | 'left' | 'right',
) {
  const shift = side === 'left' ? [-1, 0] : side === 'right' ? [1, 0] : side === 'down' ? [0, 1] : side === 'up' ? [0, -1] : null
  const dx = shift ? shift[0] : x - size / 2
  const dy = shift ? shift[1] : y - size / 2
  const len = Math.hypot(dx, dy) || 1
  const lx = Math.min(size - 46, Math.max(46, x + (dx / len) * (pad + 18)))
  const ly = Math.min(size - 16, Math.max(16, y + (dy / len) * (pad + 16)))
  ctx.font = `${Math.max(12, size / 34)}px Barlow, sans-serif`
  ctx.fillStyle = '#f6f3ec'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, lx, ly)
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
  float dist = max(uDist - p.z, 0.05);
  float ndc = clamp((dist - 0.25) / 7.5, 0.0, 1.0);
  gl_Position = vec4(p.x * uK, p.y * uK, ndc * dist, dist);
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
  float shade = 0.55 + 0.45 * clamp(light, 0.0, 1.0);
  vec3 color = texture2D(uTex, vUv).rgb * shade;
  gl_FragColor = vec4(color, 1.0);
}
`
