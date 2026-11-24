import * as THREE from 'three'

const cache = new Map<string, THREE.Texture>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

function finish(c: HTMLCanvasElement, key: string) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/** UK number plate: white front, yellow rear, exact registration AY11 ALG. */
export function plateTexture(rear: boolean) {
  const key = rear ? 'plate-rear' : 'plate-front'
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(512, 112)
  ctx.fillStyle = rear ? '#f4c430' : '#f3f4ef'
  ctx.fillRect(0, 0, 512, 112)
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, 506, 106)
  // GB band
  ctx.fillStyle = '#0b2f8a'
  ctx.fillRect(6, 6, 58, 100)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('GB', 35, 44)
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText('UK', 35, 74)
  // Registration — never changed
  ctx.fillStyle = '#111'
  ctx.font = 'bold 74px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AY11 ALG', 268, 60)
  return finish(c, key)
}

export function windowTexture(seed: number, base: string, lit: string, key: string) {
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(256, 512)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 512)
  let s = seed
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  const cols = 6
  const rows = 18
  const pad = 10
  const cw = (256 - pad * 2) / cols
  const ch = (512 - pad * 2) / rows
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const on = rnd()
      ctx.globalAlpha = on > 0.45 ? 0.55 + rnd() * 0.45 : 0.08
      ctx.fillStyle = on > 0.45 ? lit : '#000'
      ctx.fillRect(pad + x * cw + 3, pad + y * ch + 3, cw - 7, ch - 9)
    }
  }
  ctx.globalAlpha = 1
  return finish(c, key)
}

export function signTexture(text: string, sub: string, accent = '#d5c5a1') {
  const key = `sign-${text}-${sub}-${accent}`
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(512, 256)
  ctx.fillStyle = '#15171b'
  ctx.fillRect(0, 0, 512, 256)
  ctx.strokeStyle = accent
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, 492, 236)
  ctx.fillStyle = accent
  ctx.font = 'bold 58px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 106)
  ctx.fillStyle = '#e6e6e2'
  ctx.font = '24px Arial, sans-serif'
  ctx.fillText(sub, 256, 174)
  return finish(c, key)
}

export function stationSignTexture(title: string, sub: string, accent = '#d5c5a1') {
  const key = `station-${title}-${sub}-${accent}`
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(1024, 256)
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#101114')
  grad.addColorStop(1, '#1d1f24')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 256)
  ctx.strokeStyle = accent
  ctx.lineWidth = 8
  ctx.strokeRect(12, 12, 1000, 232)
  ctx.fillStyle = accent
  ctx.font = 'bold 78px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 512, 104)
  ctx.fillStyle = '#e8e8e4'
  ctx.font = '32px Arial, sans-serif'
  ctx.fillText(sub, 512, 178)
  return finish(c, key)
}

export function glowTexture() {
  const key = 'glow'
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(128, 128)
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  return finish(c, key)
}

export function shadowTexture() {
  const key = 'shadow'
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(128, 128)
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62)
  grad.addColorStop(0, 'rgba(0,0,0,0.85)')
  grad.addColorStop(0.55, 'rgba(0,0,0,0.4)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  return finish(c, key)
}

export function chequerTexture() {
  const key = 'chequer'
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(128, 64)
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f2f2ee' : '#15161a'
      ctx.fillRect(x * 32, y * 32, 32, 32)
    }
  }
  const tex = finish(c, key)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 1)
  return tex
}

export function arrowTexture() {
  const key = 'arrow'
  const hit = cache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(128, 128)
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#d5c5a1'
  ctx.beginPath()
  ctx.moveTo(64, 16)
  ctx.lineTo(108, 76)
  ctx.lineTo(80, 76)
  ctx.lineTo(80, 112)
  ctx.lineTo(48, 112)
  ctx.lineTo(48, 76)
  ctx.lineTo(20, 76)
  ctx.closePath()
  ctx.fill()
  return finish(c, key)
}
