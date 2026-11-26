/**
 * One WebGL context for every globe on the page. A visible globe borrows
 * it, draws the Earth, and copies that image into its own canvas. Globes
 * outside the screen skip the draw. The context goes away when the last
 * globe unmounts, so a long history page does not keep a context per card.
 */
import { subsolar } from '@/lib/mission'
import { EARTH_TEXTURE, RADAR_K, spherePoint } from '@/lib/radar'
import type { SkyKind } from '@/lib/sky-point'

export type HomeLegend = 'station' | 'starlink' | 'bright' | 'you'

export type GlobeView = { yaw: number; pitch: number; distance: number }

export type GlobeShareEvent = 'live' | 'fallback' | 'lost' | 'restored'

export type GlobeCanvas = {
  width: number
  height: number
  addEventListener(type: string, listener: (event: Event) => void): void
  removeEventListener(type: string, listener: (event: Event) => void): void
}

export type GlobeSeat = {
  hasContext(): boolean
  setVisible(visible: boolean): void
  setEngaged(engaged: boolean): void
  subscribe(listener: (event: GlobeShareEvent) => void): () => void
  paint(size: number, view: GlobeView, dest: CanvasRenderingContext2D): boolean
  leave(): void
}

type ShareImage = {
  naturalWidth: number
  naturalHeight: number
  width?: number
  height?: number
  crossOrigin?: string
  decoding?: string
  onload: (() => void) | null
  onerror: (() => void) | null
  src: string
}

type Program = {
  program: WebGLProgram
  pos: number
  uv: number
  yaw: WebGLUniformLocation | null
  pitch: WebGLUniformLocation | null
  dist: WebGLUniformLocation | null
  k: WebGLUniformLocation | null
  sun: WebGLUniformLocation | null
  tex: WebGLUniformLocation | null
}

type Mesh = {
  positions: WebGLBuffer
  uvs: WebGLBuffer
  indices: WebGLBuffer
  count: number
}

type Resources = {
  gl: WebGLRenderingContext
  canvas: GlobeCanvas
  program: Program | null
  mesh: Mesh | null
  texture: WebGLTexture | null
  textured: boolean
  lost: boolean
}

type SeatState = { visible: boolean; engaged: boolean }

export type GlobeShareOptions = {
  now?: () => number
  createCanvas?: () => GlobeCanvas
  getContext?: (canvas: GlobeCanvas) => WebGLRenderingContext | null
  createImage?: () => ShareImage
}

const CONTEXT: WebGLContextAttributes = {
  alpha: true,
  antialias: true,
  depth: true,
  stencil: false,
  powerPreference: 'low-power',
  premultipliedAlpha: true,
  preserveDrawingBuffer: true,
}

export function homeLegendShowsSatellite(filter: HomeLegend | null, kind: SkyKind): boolean {
  if (filter == null) return true
  if (filter === 'you') return false
  return kind === filter
}

export function homeLegendShowsYou(filter: HomeLegend | null): boolean {
  return filter == null || filter === 'you'
}

export function legendKeepsTarget(
  filter: HomeLegend | null,
  target: { type: string; id?: string } | null,
  kindOf: (id: string) => SkyKind | null,
): boolean {
  if (!filter || !target) return true
  if (filter === 'you') return target.type === 'you'
  if (target.type === 'you') return false
  if (target.type !== 'sat') return true
  return kindOf(target.id ?? '') === filter
}

export function createGlobeShare(options: GlobeShareOptions = {}) {
  const now = options.now ?? (() => Date.now())
  const createCanvas = options.createCanvas ?? (() => document.createElement('canvas'))
  const obtain = options.getContext ?? defaultContext
  const createImage = options.createImage ?? defaultImage

  let resources: Resources | null = null
  let image: ShareImage | null = null
  let imageFailed = false
  let shaderFailed = false
  let unavailable = false
  let attempts = 0
  let created = 0
  let released = 0
  let users = 0
  let draws = 0
  let blits = 0
  let detach: (() => void) | null = null
  const listeners = new Set<(event: GlobeShareEvent) => void>()
  const seats = new Set<SeatState>()

  const emit = (event: GlobeShareEvent) => {
    for (const listener of [...listeners]) listener(event)
  }

  const uploadTexture = () => {
    const current = resources
    const source = image
    if (!current || current.lost || !current.texture || !source) return
    const width = source.naturalWidth || source.width || 0
    const height = source.naturalHeight || source.height || 0
    if (width <= 0 || height <= 0) return
    const gl = current.gl
    const fitted = fitTexture(gl, source)
    const scaled = canvasSize(fitted)
    const fittedW = scaled?.w ?? width
    const fittedH = scaled?.h ?? height
    gl.getError()
    gl.bindTexture(gl.TEXTURE_2D, current.texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fitted)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    if (isPowerOfTwo(fittedW) && isPowerOfTwo(fittedH)) {
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    }
    if (gl.getError() !== gl.NO_ERROR) {
      emit('fallback')
      return
    }
    current.textured = true
    emit('live')
  }

  const kickImage = () => {
    if (image || imageFailed) {
      uploadTexture()
      return
    }
    const next = createImage()
    image = next
    next.onload = () => uploadTexture()
    next.onerror = () => {
      imageFailed = true
      emit('fallback')
    }
    next.src = EARTH_TEXTURE
  }

  const rebuild = (current: Resources) => {
    const gl = current.gl
    try {
      if (current.program) gl.deleteProgram(current.program.program)
      if (current.mesh) {
        gl.deleteBuffer(current.mesh.positions)
        gl.deleteBuffer(current.mesh.uvs)
        gl.deleteBuffer(current.mesh.indices)
      }
      if (current.texture) gl.deleteTexture(current.texture)
    } catch {
      // A lost context may already have dropped these.
    }
    current.program = buildProgram(gl)
    current.mesh = buildSphere(gl, 48, 64)
    current.texture = gl.createTexture()
    current.textured = false
    if (!current.program || !current.mesh || !current.texture) {
      shaderFailed = true
      emit('fallback')
      return
    }
    shaderFailed = false
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.disable(gl.BLEND)
  }

  const onLost = (event: Event) => {
    event.preventDefault()
    if (!resources) return
    resources.lost = true
    resources.textured = false
    emit('lost')
  }

  const onRestored = () => {
    if (!resources) return
    rebuild(resources)
    resources.lost = false
    uploadTexture()
    emit('restored')
  }

  const ensure = () => {
    if (resources) return resources
    if (unavailable) return null
    attempts += 1
    const canvas = createCanvas()
    const gl = obtain(canvas)
    if (!gl) {
      unavailable = true
      emit('fallback')
      return null
    }
    created += 1
    const releaseNode = attachCanvas(canvas)
    const current: Resources = {
      gl,
      canvas,
      program: null,
      mesh: null,
      texture: null,
      textured: false,
      lost: false,
    }
    resources = current
    rebuild(current)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    detach = () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      releaseNode()
    }
    kickImage()
    return current
  }

  const teardown = () => {
    const current = resources
    if (!current) return
    resources = null
    detach?.()
    detach = null
    try {
      current.gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // The context is already gone.
    }
    released += 1
  }

  const render = (view: GlobeView, size: number, dest: CanvasRenderingContext2D) => {
    const current = resources
    if (!current || current.lost) return false
    const px = Math.max(2, Math.round(size))
    if (!Number.isFinite(px)) return false
    const canvas = current.canvas
    const side = Math.max(px, canvas.width, canvas.height)
    if (canvas.width !== side || canvas.height !== side) {
      canvas.width = side
      canvas.height = side
    }
    const gl = current.gl
    const top = canvas.height - px
    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(0, top, px, px)
    gl.viewport(0, top, px, px)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    const program = current.program
    const mesh = current.mesh
    const texture = current.texture
    if (current.textured && program && mesh && texture) {
      const sun = subsolar(now())
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
      draws += 1
      dest.clearRect(0, 0, px, px)
      dest.drawImage(canvas as unknown as HTMLCanvasElement, 0, 0, px, px, 0, 0, px, px)
      blits += 1
    }
    return true
  }

  const join = (): GlobeSeat => {
    users += 1
    ensure()
    const seat: SeatState = { visible: true, engaged: false }
    seats.add(seat)
    const mine = new Set<(event: GlobeShareEvent) => void>()
    let left = false
    return {
      hasContext() {
        return Boolean(resources)
      },
      setVisible(visible: boolean) {
        seat.visible = visible
      },
      setEngaged(engaged: boolean) {
        seat.engaged = engaged
      },
      subscribe(listener) {
        mine.add(listener)
        listeners.add(listener)
        if (resources?.textured) listener('live')
        else if (unavailable || imageFailed || shaderFailed) listener('fallback')
        if (resources?.lost) listener('lost')
        return () => {
          mine.delete(listener)
          listeners.delete(listener)
        }
      },
      paint(size, view, dest) {
        if (!seat.visible) return false
        return render(view, size, dest)
      },
      leave() {
        if (left) return
        left = true
        for (const listener of mine) listeners.delete(listener)
        mine.clear()
        seats.delete(seat)
        users = Math.max(0, users - 1)
        if (users === 0) teardown()
      },
    }
  }

  return {
    join,
    debug() {
      let visible = 0
      let engaged = 0
      for (const seat of seats) {
        if (seat.visible) visible += 1
        if (seat.engaged) engaged += 1
      }
      return {
        attempts,
        created,
        released,
        users,
        contexts: resources ? 1 : 0,
        lost: Boolean(resources?.lost),
        unavailable,
        visible,
        engaged,
        draws,
        blits,
      }
    },
  }
}

let singleton: ReturnType<typeof createGlobeShare> | null = null

export function globeShare() {
  if (!singleton) singleton = createGlobeShare()
  return singleton
}

export function resetGlobeShareForTests() {
  singleton = null
}

function attachCanvas(canvas: GlobeCanvas): () => void {
  const node = canvas as HTMLCanvasElement
  if (typeof document === 'undefined' || typeof node.setAttribute !== 'function' || !document.body) return () => undefined
  node.setAttribute('aria-hidden', 'true')
  node.tabIndex = -1
  node.style.position = 'fixed'
  node.style.left = '-10000px'
  node.style.top = '0'
  node.style.width = '1px'
  node.style.height = '1px'
  node.style.pointerEvents = 'none'
  document.body.appendChild(node)
  return () => node.remove()
}

function defaultContext(canvas: GlobeCanvas): WebGLRenderingContext | null {
  if (!('getContext' in canvas)) return null
  return (canvas as HTMLCanvasElement).getContext('webgl', CONTEXT)
}

function defaultImage(): ShareImage {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'
  return image as unknown as ShareImage
}

function canvasSize(source: TexImageSource): { w: number; h: number } | null {
  if (typeof HTMLCanvasElement === 'undefined' || !(source instanceof HTMLCanvasElement)) return null
  return { w: source.width, h: source.height }
}

function fitTexture(gl: WebGLRenderingContext, image: ShareImage): TexImageSource {
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048
  const width = image.naturalWidth || image.width || 0
  const height = image.naturalHeight || image.height || 0
  if (width > 0 && height > 0 && width <= max && height <= max && isPowerOfTwo(width) && isPowerOfTwo(height)) {
    return image as unknown as TexImageSource
  }
  const canvas = document.createElement('canvas')
  const limit = Math.min(max, 2048)
  const scale = Math.min(1, limit / Math.max(width, height, 1))
  canvas.width = potFloor(Math.max(2, Math.round(width * scale)))
  canvas.height = potFloor(Math.max(2, Math.round(height * scale)))
  canvas.getContext('2d')?.drawImage(image as unknown as HTMLImageElement, 0, 0, canvas.width, canvas.height)
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

function buildProgram(gl: WebGLRenderingContext): Program | null {
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

function buildSphere(gl: WebGLRenderingContext, stacks: number, slices: number): Mesh | null {
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
  const uvBuffer = gl.createBuffer()
  const indexBuffer = gl.createBuffer()
  if (!positionBuffer || !uvBuffer || !indexBuffer) return null
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)
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
