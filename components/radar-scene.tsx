'use client'

import { useEffect, useRef, useState } from 'react'
import { bindGlobePointers, createFrameLoop, createGlobeGesture, GLOBE_DOUBLE_TAP_MS, type PinchAction } from '@/lib/globe-gesture'
import { globeShare, homeLegendShowsSatellite, homeLegendShowsYou, type HomeLegend } from '@/lib/globe-share'
import { claimGlobe, sharedScrollLock, vacateGlobe } from '@/lib/globe-lock'
import { placeLabels, pointInLabel, type LabelObstacle, type LabelSide } from '@/lib/globe-labels'
import {
  RADAR_COPY,
  clampDistance,
  clampPitch,
  coastView,
  doubleTapDistance,
  dragFollow,
  easeView,
  globeRadiusPx,
  latLonAt,
  launchPhase,
  lerpFixes,
  lookUnderFinger,
  openingView,
  pathCaption,
  projectRadar,
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
type LabelHit = { target: RadarTarget; x: number; y: number; w: number; h: number }

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
  onEngagedChange?: (engaged: boolean) => void
  /** Home legend filter. Null shows every dot. */
  legend?: HomeLegend | null
}

export function RadarScene(props: Props) {
  const propsRef = useRef(props)
  const wrapRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef<HTMLCanvasElement>(null)
  const exitRef = useRef<() => void>(() => undefined)
  const [engagedUi, setEngagedUi] = useState(false)

  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const wrap = wrapRef.current
    const glCanvas = glRef.current
    const over = overRef.current
    if (!wrap || !glCanvas || !over) return
    let dead = false
    const seat = globeShare().join()
    const unsubscribe = seat.subscribe((event) => {
      if (dead) return
      if (event === 'live') propsRef.current.onLive()
      if (event === 'fallback') propsRef.current.onFallback()
    })
    const display = glCanvas.getContext('2d', { alpha: true })
    const overlay = over.getContext('2d')
    if (!seat.hasContext() || !display || !overlay) {
      propsRef.current.onFallback()
      unsubscribe()
      seat.leave()
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
    const labelHits: LabelHit[] = []
    let paused = false
    let timer = 0
    let idle = 0
    let userMoved = false
    let grab: { lat: number; lon: number } | null = null
    let pinchView: { dist: number; distance: number; grab: { lat: number; lon: number } | null } | null = null
    let vel = { yaw: 0, pitch: 0 }
    let ease: { from: RadarView; to: RadarView; start: number; dur: number } | null = null
    let lastDraw = performance.now()
    let traceOrigin = -1
    let tapTimer = 0
    const samples: { t: number; yaw: number; pitch: number }[] = []
    const frames = createFrameLoop(
      (cb) => window.requestAnimationFrame(cb),
      (id) => window.cancelAnimationFrame(id),
    )
    const gesture = createGlobeGesture({
      now: () => performance.now(),
      capture: (id) => {
        try {
          over.setPointerCapture(id)
        } catch {
          // The pointer can end before capture.
        }
      },
      release: (id) => {
        try {
          if (over.hasPointerCapture(id)) over.releasePointerCapture(id)
        } catch {
          // Capture was already released.
        }
      },
    })
    let claimId = 0
    let releaseLock: (() => void) | null = null
    const engagedRef = { current: false }
    const exit = () => {
      if (!engagedRef.current && !releaseLock) return
      engagedRef.current = false
      gesture.setEngaged(false)
      seat.setEngaged(false)
      releaseLock?.()
      releaseLock = null
      const id = claimId
      claimId = 0
      if (id) vacateGlobe(id)
      setEngagedUi(false)
      propsRef.current.onEngagedChange?.(false)
    }
    const enter = () => {
      if (engagedRef.current) return
      releaseLock = sharedScrollLock().hold(document, window)
      claimId = claimGlobe(exit)
      engagedRef.current = true
      gesture.setEngaged(true)
      seat.setEngaged(true)
      seat.setVisible(true)
      setEngagedUi(true)
      propsRef.current.onEngagedChange?.(true)
    }
    exitRef.current = exit

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const css = Math.max(2, Math.min(rect.width, rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.max(2, Math.round(css * dpr))
      if (glCanvas.width !== px || glCanvas.height !== px) {
        glCanvas.width = px
        glCanvas.height = px
      }
      if (over.width !== px || over.height !== px) {
        over.width = px
        over.height = px
      }
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

    const assignView = (nextView: RadarView) => {
      if (!Number.isFinite(nextView.yaw) || !Number.isFinite(nextView.pitch) || !Number.isFinite(nextView.distance)) return
      view.yaw = nextView.yaw
      view.pitch = nextView.pitch
      view.distance = nextView.distance
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
      gesture.tick(nowMs)
      const dt = Math.min(34, Math.max(0, nowMs - lastDraw))
      lastDraw = nowMs
      const hands = gesture.debug()
      const turning = hands.phase === 'turn' || hands.phase === 'pinch' || hands.pointers > 0
      if (ease && !turning) {
        const u = Math.min(1, (nowMs - ease.start) / ease.dur)
        assignView(easeView(ease.from, ease.to, u))
        if (u >= 1) ease = null
      } else if (!userMoved && hands.phase !== 'turn' && hands.phase !== 'pinch') {
        const framed = framedOpening()
        const gap = Math.hypot(framed.yaw - view.yaw, framed.pitch - view.pitch) + Math.abs(framed.distance - view.distance)
        if (gap > 0.04) startEase(framed, 520)
        else assignView(framed)
      } else if (!turning) {
        if (Math.hypot(vel.yaw, vel.pitch) > 1e-6) {
          const coast = coastView(view, vel, dt)
          view.yaw = coast.view.yaw
          view.pitch = coast.view.pitch
          vel = coast.velocity
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
      if (!paused && !ease && !propsRef.current.reduced && !turning && Date.now() - idle > 1600) {
        if (Math.hypot(vel.yaw, vel.pitch) < 2e-6) view.yaw += 0.0000375 * dt
      }
      seat.paint(size, { yaw: view.yaw, pitch: view.pitch, distance: view.distance }, display)
      overlay.clearRect(0, 0, size, size)
      hits.length = 0
      labelHits.length = 0
      const labelJobs: { id: string; target: RadarTarget; text: string; x: number; y: number; r: number; prefer?: LabelSide }[] = []
      const obstacles: LabelObstacle[] = []
      const launch = propsRef.current.launch
      const phase = launch ? launchPhase(launch, Date.now()) : 'flown'
      const caption = launch && phase !== 'flown' ? pathCaption(launch, phase) : null
      if (launch && phase !== 'flown') {
        const width = Math.max(2, size / 280)
        strokeChain(overlay, launch.track, view, size, '#f3d7b0', width)
        const pad = projectRadar(launch.padLat, launch.padLon, view, size)
        if (pad) {
          const padR = Math.max(6, size / 80)
          diamond(overlay, pad.x, pad.y, padR, '#f3d7b0')
          hits.push({ target: { type: 'pad' }, x: pad.x, y: pad.y, rank: 5 })
          obstacles.push({ kind: 'disc', x: pad.x, y: pad.y, r: padR })
          if (caption) labelJobs.push({ id: 'path-caption', target: { type: 'path' }, text: caption, x: pad.x, y: pad.y, r: padR, prefer: 'up' })
        }
        pushSegments(obstacles, launch.track, view, size)
      }
      if (track.length > 1) strokeChain(overlay, track, view, size, '#c5d2e2', Math.max(1.6, size / 360))
      const pattern = propsRef.current.overlay
      if (pattern) {
        const width = Math.max(2, size / 280)
        if (pattern.traceMs && traceOrigin < 0) traceOrigin = nowMs
        const trace = !propsRef.current.reduced && pattern.traceMs && pattern.traceMs > 0 ? Math.min(1, (nowMs - traceOrigin) / pattern.traceMs) : 1
        const earthR = globeRadiusPx(size, view.distance)
        obstacles.push({ kind: 'disc', x: size / 2, y: size / 2, r: earthR })
        const total = pattern.chains.reduce((sum, chain) => sum + Math.max(0, chain.points.length - 1), 0) || 1
        let budget = trace * total
        for (const chain of pattern.chains) {
          const span = Math.max(0, chain.points.length - 1)
          const take = trace >= 1 ? chain.points.length : Math.min(chain.points.length, Math.floor(budget) + 1)
          if (take > 1) {
            const shown = chain.points.slice(0, take)
            strokeChain(overlay, shown, view, size, chain.color, width)
            pushSegments(obstacles, shown, view, size)
          }
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
            obstacles.push({ kind: 'disc', x: spot.x, y: spot.y, r: body })
            labelJobs.push({ id: mark.id, target: { type: 'orbit', id: mark.id }, text: 'Moon', x: spot.x, y: spot.y, r: body, prefer: 'up' })
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
          obstacles.push({ kind: 'disc', x: spot.x, y: spot.y, r: radius })
          if (mark.canvas) labelJobs.push({ id: mark.id, target: { type: 'orbit', id: mark.id }, text: mark.canvas, x: spot.x, y: spot.y, r: radius, prefer: mark.side })
        }
      }
      if (labelJobs.length > 0) labelHits.push(...paintLabels(overlay, labelJobs, obstacles, size))
      const fixes = shownFixes()
      const legend = propsRef.current.legend ?? null
      const ordered = fixes.slice().sort((a, b) => RANK[a.kind] - RANK[b.kind])
      for (const fix of ordered) {
        if (!homeLegendShowsSatellite(legend, fix.kind)) continue
        const spot = projectRadar(fix.lat, fix.lon, view, size)
        if (!spot) continue
        const chosen = selected?.type === 'sat' && fix.noradId === selected.id
        const highlighted = legend === fix.kind
        const radius = (fix.kind === 'station' ? 7 : fix.kind === 'hubble' ? 5.5 : 4) * (size / 700) * (chosen ? 1.45 : highlighted ? 1.35 : 1)
        const dot = Math.max(2.4, radius)
        overlay.fillStyle = DOT[fix.kind]
        overlay.beginPath()
        overlay.arc(spot.x, spot.y, dot, 0, Math.PI * 2)
        overlay.fill()
        if (highlighted) {
          overlay.strokeStyle = '#f6f3ec'
          overlay.lineWidth = Math.max(1.5, size / 420)
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, dot + Math.max(3, size / 160), 0, Math.PI * 2)
          overlay.stroke()
        }
        hits.push({ target: { type: 'sat', id: fix.noradId }, x: spot.x, y: spot.y, rank: 2 + RANK[fix.kind] })
      }
      const you = propsRef.current.place
      if (you && homeLegendShowsYou(legend)) {
        const spot = projectRadar(you.lat, you.lon, view, size)
        if (spot) {
          const scale = legend === 'you' ? 1.35 : 1
          overlay.strokeStyle = '#f6f3ec'
          overlay.lineWidth = Math.max(1.5, size / 400)
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, Math.max(6, size / 70) * scale, 0, Math.PI * 2)
          overlay.stroke()
          overlay.fillStyle = '#f6f3ec'
          overlay.beginPath()
          overlay.arc(spot.x, spot.y, Math.max(2.2, size / 170) * scale, 0, Math.PI * 2)
          overlay.fill()
          hits.push({ target: { type: 'you' }, x: spot.x, y: spot.y, rank: 4 })
        }
      }
    }

    const loop = () => {
      if (paused || dead) return
      draw()
    }
    const start = () => {
      if (paused || dead) return
      recompute()
      window.clearInterval(timer)
      timer = window.setInterval(recompute, 1000)
      frames.start(loop)
    }
    const stop = () => {
      window.clearInterval(timer)
      frames.stop()
    }
    const syncPause = () => {
      const hidden = document.visibilityState === 'hidden'
      const box = wrap.getBoundingClientRect()
      const off = !gesture.isEngaged() && (box.bottom < 0 || box.top > window.innerHeight)
      const should = hidden || off
      seat.setVisible(!should)
      seat.setEngaged(gesture.isEngaged())
      if (should === paused) return
      paused = should
      if (paused) {
        stop()
        prev = null
      } else start()
    }

    const pick = (pixelX: number, pixelY: number) => {
      const minLabel = 44 * (over.width / Math.max(1, over.clientWidth))
      for (const label of labelHits) {
        if (pointInLabel(pixelX, pixelY, label, minLabel)) {
          propsRef.current.onSelect(label.target)
          return
        }
      }
      const reach = Math.max(minLabel, over.width * 0.07)
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

    const beginTurn = (clientX: number, clientY: number) => {
      const point = canvasPoint(clientX, clientY)
      userMoved = true
      ease = null
      pinchView = null
      stopMotion()
      grab = latLonAt(point.x, point.y, view, over.width) ?? propsRef.current.place
      rememberSample()
    }

    const applyPinch = (action: PinchAction) => {
      const mid = canvasPoint((action.pointers[0].x + action.pointers[1].x) / 2, (action.pointers[0].y + action.pointers[1].y) / 2)
      if (action.start || !pinchView) {
        userMoved = true
        ease = null
        grab = null
        stopMotion()
        pinchView = {
          dist: action.dist,
          distance: view.distance,
          grab: latLonAt(mid.x, mid.y, view, over.width),
        }
      }
      assignView(lookUnderFinger(view, pinchView.grab, mid.x, mid.y, over.width, pinchView.distance * (pinchView.dist / (action.dist || 1))))
      idle = Date.now()
    }

    const dragTo = (clientX: number, clientY: number) => {
      const point = canvasPoint(clientX, clientY)
      if (!grab) {
        beginTurn(clientX, clientY)
        return
      }
      const followed = dragFollow(view, grab, point.x, point.y, over.width)
      view.yaw = followed.yaw
      view.pitch = followed.pitch
      rememberSample()
      idle = performance.now()
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

    const unbind = bindGlobePointers(over, window, gesture, {
      read: (event) => {
        const point = canvasPoint(event.clientX, event.clientY)
        const radius = globeRadiusPx(over.width, view.distance)
        const center = over.width / 2
        const type = event.pointerType === 'mouse' ? 'mouse' : event.pointerType === 'pen' ? 'pen' : 'touch'
        return {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          type,
          button: event.button,
          primary: event.isPrimary !== false,
          inside: Math.hypot(point.x - center, point.y - center) <= radius,
        }
      },
      onDown: (action) => {
        window.clearTimeout(tapTimer)
        if (action.type === 'ignore' || action.type === 'scroll' || action.type === 'pending') return
        stopMotion()
        idle = Date.now()
        if (action.type === 'pinch') applyPinch(action)
        else if (action.type === 'mouse-turn' || action.type === 'start-turn') beginTurn(action.point.x, action.point.y)
      },
      onMove: (action) => {
        if (action.type === 'pinch') applyPinch(action)
        else if (action.type === 'start-turn') beginTurn(action.point.x, action.point.y)
        else if (action.type === 'turn') dragTo(action.point.x, action.point.y)
      },
      onUp: (action) => {
        if (action.type === 'ignore') return
        if (action.type === 'engage') {
          enter()
          return
        }
        if (action.type === 'end') {
          vel = { yaw: 0, pitch: 0 }
          samples.length = 0
          grab = null
          pinchView = null
          return
        }
        window.clearTimeout(tapTimer)
        if (action.type === 'double-tap') {
          zoomFromTap(canvasPoint(action.point.x, action.point.y))
          grab = null
          pinchView = null
          return
        }
        if (action.type === 'tap') {
          const point = canvasPoint(action.point.x, action.point.y)
          tapTimer = window.setTimeout(() => pick(point.x, point.y), GLOBE_DOUBLE_TAP_MS)
          grab = null
          return
        }
        if (action.type === 'turn-end' && !propsRef.current.reduced) vel = velocityFromSamples(samples)
        else vel = { yaw: 0, pitch: 0 }
        samples.length = 0
        grab = null
        if (gesture.debug().phase !== 'pinch') pinchView = null
        idle = Date.now()
      },
      onTouches: (action) => {
        if (action) applyPinch(action)
      },
    })

    const onWheel = (event: WheelEvent) => {
      if (!gesture.isEngaged()) return
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
      if (event.key === 'Escape') {
        if (gesture.isEngaged()) exit()
        else propsRef.current.onSelect(null)
        event.preventDefault()
        return
      }
      if (!gesture.isEngaged()) return
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
      else return
      event.preventDefault()
    }
    const onOutside = (event: PointerEvent) => {
      if (!gesture.isEngaged()) return
      const target = event.target
      if (target instanceof Node && wrap.contains(target)) return
      exit()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !gesture.isEngaged()) return
      exit()
    }

    resize()
    start()
    syncPause()
    const observer = new IntersectionObserver(syncPause, { threshold: 0.05 })
    observer.observe(wrap)
    document.addEventListener('visibilitychange', syncPause)
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('keydown', onEscape)
    over.addEventListener('wheel', onWheel, { passive: false })
    over.addEventListener('keydown', onKey)

    return () => {
      dead = true
      paused = true
      exit()
      window.clearTimeout(tapTimer)
      stop()
      unbind()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncPause)
      document.removeEventListener('pointerdown', onOutside, true)
      window.removeEventListener('keydown', onEscape)
      over.removeEventListener('wheel', onWheel)
      over.removeEventListener('keydown', onKey)
      unsubscribe()
      seat.leave()
    }
  }, [])

  return (
    <div className="radar-live" ref={wrapRef}>
      <canvas ref={glRef} className="radar-gl" aria-hidden="true" />
      <canvas
        ref={overRef}
        className={engagedUi ? 'radar-over is-engaged' : 'radar-over'}
        tabIndex={0}
        aria-label={engagedUi ? RADAR_COPY.engaged : props.ariaLabel ?? RADAR_COPY.liveLabel}
      />
      {engagedUi ? (
        <button type="button" className="globe-done" onClick={() => exitRef.current()}>
          {RADAR_COPY.done}
        </button>
      ) : (
        <p className="globe-hint">{RADAR_COPY.gesture}</p>
      )}
    </div>
  )
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

function paintLabels(
  ctx: CanvasRenderingContext2D,
  jobs: { id: string; target: RadarTarget; text: string; x: number; y: number; r: number; prefer?: LabelSide }[],
  obstacles: LabelObstacle[],
  size: number,
): LabelHit[] {
  const font = Math.max(12, size / 34)
  ctx.font = `${font}px Barlow, sans-serif`
  const requests = jobs.map((job) => ({ id: job.id, anchor: { x: job.x, y: job.y }, w: ctx.measureText(job.text).width + 6, h: font + 2, prefer: job.prefer }))
  requests.sort((a, b) => b.w - a.w)
  const placed = placeLabels(requests, obstacles, { w: size, h: size }, 8, Math.max(14, font * 0.95))
  const byId = new Map(placed.map((item) => [item.id, item]))
  const targets = new Map(jobs.map((job) => [job.id, job.target]))
  const widths = new Map(requests.map((job) => [job.id, job.w]))
  const heights = new Map(requests.map((job) => [job.id, job.h]))
  ctx.lineWidth = Math.max(1, size / 520)
  ctx.strokeStyle = 'rgba(197, 210, 226, 0.75)'
  ctx.fillStyle = '#f6f3ec'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const hits: LabelHit[] = []
  for (const job of jobs) {
    const spot = byId.get(job.id)
    const target = targets.get(job.id)
    if (!spot || !target) continue
    if (spot.leader) {
      const dx = spot.x - job.x
      const dy = spot.y - job.y
      const len = Math.hypot(dx, dy) || 1
      ctx.beginPath()
      ctx.moveTo(job.x + (dx / len) * (job.r + 2), job.y + (dy / len) * (job.r + 2))
      ctx.lineTo(spot.x - (dx / len) * (ctx.measureText(job.text).width / 2 + 2), spot.y)
      ctx.stroke()
    }
    ctx.fillText(job.text, spot.x, spot.y)
    hits.push({ target, x: spot.x, y: spot.y, w: widths.get(job.id) ?? font, h: heights.get(job.id) ?? font })
  }
  return hits
}

function pushSegments(
  obstacles: LabelObstacle[],
  points: { lat: number; lon: number; radius?: number }[],
  view: RadarView,
  size: number,
) {
  let prev: { x: number; y: number } | null = null
  const step = Math.max(1, Math.floor(points.length / 96))
  for (let index = 0; index < points.length; index += step) {
    const spot = projectRadar(points[index].lat, points[index].lon, view, size, points[index].radius ?? 1)
    if (!spot || (prev && Math.hypot(spot.x - prev.x, spot.y - prev.y) > size * 0.34)) {
      prev = spot
      continue
    }
    if (prev) obstacles.push({ kind: 'seg', x1: prev.x, y1: prev.y, x2: spot.x, y2: spot.y })
    prev = spot
  }
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
