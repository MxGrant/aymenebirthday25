/** Tiny deterministic RNG so every level builds the same world on every visit. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const clamp01 = (v: number) => clamp(v, 0, 1)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
export const randRange = (rnd: () => number, lo: number, hi: number) => lo + rnd() * (hi - lo)
export const pick = <T,>(rnd: () => number, arr: T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length]
