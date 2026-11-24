import * as THREE from 'three'
import { clamp, mulberry32, pick, randRange, smoothstep } from './rng'
import type { CollectibleKind, LevelSpec, Surface } from './types'

export type PropKind =
  | 'tree'
  | 'pine'
  | 'hedge'
  | 'fence'
  | 'lamp'
  | 'sign'
  | 'building'
  | 'tower'
  | 'house'
  | 'mountain'
  | 'rock'
  | 'tyre'
  | 'grandstand'
  | 'stall'
  | 'bush'

export interface PropSpec {
  type: PropKind
  x: number
  y: number
  z: number
  rotY: number
  scale: number
  height?: number
  variant?: number
}

export interface TrackSample {
  position: THREE.Vector3
  tangent: THREE.Vector3
  right: THREE.Vector3
  s: number
  curvature: number
}

export interface Collider {
  x: number
  z: number
  r: number
  kind: string
}

export interface Gate {
  s: number
  position: THREE.Vector3
  yaw: number
}

export interface Collectible {
  id: string
  kind: CollectibleKind
  position: THREE.Vector3
  s: number
  lateral: number
}

export interface StationPlacement {
  position: THREE.Vector3
  yaw: number
  bay: { x: number; z: number; yaw: number; halfW: number; halfL: number }
}

export interface Track {
  level: LevelSpec
  samples: TrackSample[]
  length: number
  halfRoad: number
  start: { position: THREE.Vector3; yaw: number }
  station: StationPlacement
  gates: Gate[]
  collectibles: Collectible[]
  props: PropSpec[]
  colliders: Collider[]
  minimap: { x: number; y: number }[]
}

const PROP_MIX: Record<Surface, PropKind[]> = {
  garage: [],
  city: ['building', 'tower', 'building', 'lamp', 'sign', 'tree'],
  riverside: ['building', 'lamp', 'tree', 'sign', 'bush'],
  tunnel: [],
  food: ['building', 'stall', 'lamp', 'sign', 'tree'],
  sweet: ['house', 'stall', 'lamp', 'sign', 'tree'],
  westend: ['building', 'lamp', 'sign', 'building'],
  motorway: ['lamp', 'sign', 'tree', 'bush'],
  country: ['tree', 'hedge', 'fence', 'sign', 'tree', 'bush'],
  village: ['house', 'tree', 'hedge', 'lamp', 'sign'],
  hills: ['tree', 'hedge', 'fence', 'sign', 'bush'],
  lake: ['tree', 'rock', 'sign', 'bush'],
  mountain: ['mountain', 'pine', 'rock', 'sign', 'pine'],
  forest: ['pine', 'tree', 'rock', 'bush'],
  coast: ['rock', 'tree', 'sign', 'lamp', 'bush'],
  circuit: ['tyre', 'grandstand', 'lamp', 'sign'],
  station: [],
}

const ROAD_STEP = 2.5

export function buildTrack(level: LevelSpec): Track {
  const rnd = mulberry32(level.id * 7919 + 13)
  const length = level.length
  const halfRoad = level.roadWidth / 2
  const wobbles = 1.15 + level.curviness * 1.9
  const amp = (10 + level.curviness * 52) * Math.min(1.25, length / 1050 + 0.35)
  const amp2 = amp * 0.3
  const phase = rnd() * Math.PI * 2
  const phase2 = rnd() * Math.PI * 2
  const phase3 = rnd() * Math.PI * 2
  const phase4 = rnd() * Math.PI * 2
  const hillAmp = level.hills
  const hillWobbles = 0.8 + level.curviness * 1.2

  const envAt = (t: number) => smoothstep((t - 0.015) / 0.07) * smoothstep((0.975 - t) / 0.07)

  const posAt = (t: number) => {
    const e = envAt(t)
    const x =
      e * (amp * Math.sin(t * Math.PI * 2 * wobbles + phase) + amp2 * Math.sin(t * Math.PI * 2 * wobbles * 2.15 + phase2))
    const y = e * hillAmp * (0.62 * Math.sin(t * Math.PI * 2 * hillWobbles + phase3) + 0.38 * Math.sin(t * Math.PI * 2 * hillWobbles * 1.8 + phase4))
    const z = -t * length
    return new THREE.Vector3(x, y, z)
  }

  const count = Math.max(24, Math.round(length / ROAD_STEP))
  const samples: TrackSample[] = []
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const p = posAt(t)
    const a = posAt(Math.max(0, t - 0.0008))
    const b = posAt(Math.min(1, t + 0.0008))
    const tangent = b.clone().sub(a).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize()
    let curvature = 0
    if (samples.length > 0) {
      const prev = samples[samples.length - 1].tangent
      curvature = 1 - clamp(prev.dot(tangent), -1, 1)
    }
    samples.push({ position: p, tangent, right, s: t * length, curvature })
  }

  const sampleAt = (s: number): TrackSample => {
    const t = clamp(s / length, 0, 1)
    const idx = clamp(Math.round(t * count), 0, samples.length - 1)
    return samples[idx]
  }

  const pointAt = (s: number, lateral = 0): THREE.Vector3 => {
    const sm = sampleAt(s)
    return sm.position.clone().addScaledVector(sm.right, lateral)
  }

  const startSample = samples[2]
  const startYaw = Math.atan2(startSample.tangent.x, startSample.tangent.z)
  const start = { position: startSample.position.clone().add(new THREE.Vector3(0, 0, 0)), yaw: startYaw }

  const endSample = samples[samples.length - 1]
  const endYaw = Math.atan2(endSample.tangent.x, endSample.tangent.z)
  const bayCenter = endSample.position.clone().addScaledVector(endSample.tangent, 14)
  const stationPos = endSample.position.clone().addScaledVector(endSample.tangent, 26)

  const station: StationPlacement = {
    position: stationPos,
    yaw: endYaw,
    bay: { x: bayCenter.x, z: bayCenter.z, yaw: endYaw, halfW: 3.4, halfL: 6.2 },
  }

  // ---- Collectibles -------------------------------------------------------
  const collectibles: Collectible[] = []
  const wanted = level.collectibles.count
  for (let i = 0; i < wanted; i++) {
    const frac = 0.14 + (i / Math.max(1, wanted - 1)) * 0.68
    const s = frac * length
    const hidden = i % 3 === 2
    const side = i % 2 === 0 ? 1 : -1
    const lateral = hidden ? side * (halfRoad + randRange(rnd, 7, 15)) : side * halfRoad * randRange(rnd, 0.15, 0.55)
    collectibles.push({
      id: `c${level.id}-${i}`,
      kind: level.collectibles.kind,
      position: pointAt(s, lateral).add(new THREE.Vector3(0, 1.15, 0)),
      s,
      lateral,
    })
  }

  // ---- Checkpoint gates ---------------------------------------------------
  const gateCount = level.objective.type === 'checkpoints' ? level.objective.gateCount ?? 5 : 0
  const gates: Gate[] = []
  for (let i = 0; i < gateCount; i++) {
    const frac = 0.18 + (i / gateCount) * 0.68
    const sm = sampleAt(frac * length)
    gates.push({ s: sm.s, position: sm.position.clone(), yaw: Math.atan2(sm.tangent.x, sm.tangent.z) })
  }

  // ---- Scenery ------------------------------------------------------------
  const props: PropSpec[] = []
  const colliders: Collider[] = []
  const mix = PROP_MIX[level.surface] ?? ['tree']
  const isUrban = level.surface === 'city' || level.surface === 'riverside' || level.surface === 'westend' || level.surface === 'food' || level.surface === 'sweet'

  const pushProp = (type: PropKind, s: number, lateral: number, rotJitter = true) => {
    const sm = sampleAt(s)
    const p = sm.position.clone().addScaledVector(sm.right, lateral)
    const scale = type === 'building' || type === 'tower' ? randRange(rnd, 0.75, 1.5) : randRange(rnd, 0.75, 1.45)
    const prop: PropSpec = {
      type,
      x: p.x,
      y: sm.position.y,
      z: p.z,
      rotY: rotJitter ? randRange(rnd, 0, Math.PI * 2) : Math.atan2(sm.tangent.x, sm.tangent.z),
      scale,
      variant: rnd(),
    }
    if (type === 'building') {
      prop.scale = randRange(rnd, 0.9, 2.0)
      prop.height = randRange(rnd, 12, 46) * (level.timeOfDay === 'night' ? 1.15 : 1)
    } else if (type === 'tower') {
      prop.scale = randRange(rnd, 1.1, 1.9)
      prop.height = randRange(rnd, 34, 90)
    } else if (type === 'house') {
      prop.scale = randRange(rnd, 0.85, 1.35)
      prop.height = randRange(rnd, 5, 8)
    } else if (type === 'mountain') {
      prop.scale = randRange(rnd, 1.4, 3.4)
      prop.height = randRange(rnd, 70, 150)
    } else if (type === 'tree' || type === 'pine') {
      prop.scale = randRange(rnd, 0.75, 1.5)
    } else if (type === 'grandstand') {
      prop.scale = randRange(rnd, 0.9, 1.2)
    }
    props.push(prop)

    if (type === 'building' || type === 'tower') {
      colliders.push({ x: p.x, z: p.z, r: 5.5 * prop.scale, kind: 'building' })
    } else if (type === 'house') {
      colliders.push({ x: p.x, z: p.z, r: 4.5 * prop.scale, kind: 'house' })
    } else if (type === 'tree' || type === 'pine') {
      colliders.push({ x: p.x, z: p.z, r: 0.8 * prop.scale, kind: 'tree' })
    } else if (type === 'lamp') {
      colliders.push({ x: p.x, z: p.z, r: 0.4, kind: 'lamp' })
    } else if (type === 'stall') {
      colliders.push({ x: p.x, z: p.z, r: 2.2, kind: 'stall' })
    } else if (type === 'tyre') {
      colliders.push({ x: p.x, z: p.z, r: 1.6, kind: 'tyre' })
    } else if (type === 'grandstand') {
      colliders.push({ x: p.x, z: p.z, r: 7 * prop.scale, kind: 'stand' })
    }
  }

  const sceneryEnd = length - 62
  const spacing = isUrban ? 26 : level.surface === 'forest' ? 14 : level.surface === 'motorway' ? 30 : 20

  if (level.surface !== 'garage' && level.surface !== 'station' && level.surface !== 'tunnel') {
    for (let s = 34; s < sceneryEnd; s += spacing * randRange(rnd, 0.75, 1.3)) {
      const type = pick(rnd, mix)
      const bulky = type === 'building' || type === 'tower' || type === 'house' || type === 'stall' || type === 'grandstand' || type === 'mountain'
      // Bulky props sit well clear of the tarmac so the road stays drivable.
      const near = halfRoad + (bulky ? randRange(rnd, 16, 28) : randRange(rnd, 4.6, 12))
      const side = rnd() > 0.5 ? 1 : -1
      pushProp(type, s, side * near, true)
      if (rnd() > 0.35) {
        pushProp(pick(rnd, mix), s + randRange(rnd, -6, 6), -side * (halfRoad + randRange(rnd, 16, 42)), true)
      }
      if (isUrban && rnd() > 0.4) {
        pushProp('building', s + randRange(rnd, -8, 8), side * (halfRoad + randRange(rnd, 28, 62)), true)
      }
    }
  }

  // Street lamps follow the road edge at night on urban/motorway routes.
  if ((level.timeOfDay === 'night' || level.timeOfDay === 'sunset') && level.surface !== 'garage') {
    for (let s = 24; s < length - 40; s += 44) {
      const side = (Math.round(s / 44) % 2 === 0 ? 1 : -1) as 1 | -1
      const sm = sampleAt(s)
      const p = sm.position.clone().addScaledVector(sm.right, side * (halfRoad + 2.2))
      props.push({
        type: 'lamp',
        x: p.x,
        y: sm.position.y,
        z: p.z,
        rotY: Math.atan2(sm.tangent.x, sm.tangent.z) + (side === 1 ? Math.PI : 0),
        scale: 1,
      })
      colliders.push({ x: p.x, z: p.z, r: 0.4, kind: 'lamp' })
    }
  }

  // Tyre walls along circuit corners.
  if (level.surface === 'circuit') {
    for (let s = 60; s < sceneryEnd; s += 30) {
      const sm = sampleAt(s)
      for (const side of [1, -1]) {
        const p = sm.position.clone().addScaledVector(sm.right, side * (halfRoad + 3.2))
        props.push({ type: 'tyre', x: p.x, y: sm.position.y, z: p.z, rotY: 0, scale: 1 })
      }
    }
  }

  // ---- Station colliders --------------------------------------------------
  const bay = station.bay
  const rightVec = new THREE.Vector3(Math.cos(endYaw), 0, -Math.sin(endYaw)).multiplyScalar(-1)
  const shopPos = new THREE.Vector3(bay.x, 0, bay.z).addScaledVector(rightVec, 17)
  colliders.push({ x: shopPos.x, z: shopPos.z, r: 10, kind: 'shop' })
  for (const side of [-1, 1]) {
    const pump = new THREE.Vector3(bay.x, 0, bay.z).addScaledVector(rightVec, side * 7.2)
    colliders.push({ x: pump.x, z: pump.z, r: 1.3, kind: 'pump' })
  }

  const minimap: { x: number; y: number }[] = []
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const sm of samples) {
    minX = Math.min(minX, sm.position.x)
    maxX = Math.max(maxX, sm.position.x)
    minZ = Math.min(minZ, sm.position.z)
    maxZ = Math.max(maxZ, sm.position.z)
  }
  const spanX = Math.max(1, maxX - minX)
  const spanZ = Math.max(1, maxZ - minZ)
  for (let i = 0; i < samples.length; i += 4) {
    minimap.push({
      x: (samples[i].position.x - minX) / spanX,
      y: (samples[i].position.z - minZ) / spanZ,
    })
  }
  const stationPoint = { x: (bay.x - minX) / spanX, y: (bay.z - minZ) / spanZ }

  return {
    level,
    samples,
    length,
    halfRoad,
    start,
    station,
    gates,
    collectibles,
    props,
    colliders,
    minimap: [...minimap, stationPoint],
  }
}

export interface TrackHit {
  index: number
  s: number
  lateral: number
  y: number
  tangent: THREE.Vector3
  right: THREE.Vector3
  curvature: number
}

/** Nearest point on the centreline. Uses a hint index for cheap per-frame queries. */
export function nearestOnTrack(track: Track, x: number, z: number, hint = -1): TrackHit {
  const arr = track.samples
  const n = arr.length
  let best = 0
  let bestD = Infinity

  if (hint >= 0) {
    const lo = Math.max(0, hint - 70)
    const hi = Math.min(n - 1, hint + 70)
    for (let i = lo; i <= hi; i++) {
      const dx = arr[i].position.x - x
      const dz = arr[i].position.z - z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
  } else {
    for (let i = 0; i < n; i += 4) {
      const dx = arr[i].position.x - x
      const dz = arr[i].position.z - z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    for (let i = Math.max(0, best - 4); i <= Math.min(n - 1, best + 4); i++) {
      const dx = arr[i].position.x - x
      const dz = arr[i].position.z - z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
  }

  const sm = arr[best]
  const dx = x - sm.position.x
  const dz = z - sm.position.z
  const lateral = dx * sm.right.x + dz * sm.right.z
  const along = dx * sm.tangent.x + dz * sm.tangent.z
  return {
    index: best,
    s: clamp(sm.s + along, 0, track.length),
    lateral,
    y: sm.position.y,
    tangent: sm.tangent,
    right: sm.right,
    curvature: sm.curvature,
  }
}

export function pointOnTrack(track: Track, s: number, lateral = 0): THREE.Vector3 {
  const t = clamp(s / track.length, 0, 1)
  const idx = clamp(Math.round(t * (track.samples.length - 1)), 0, track.samples.length - 1)
  const sm = track.samples[idx]
  return sm.position.clone().addScaledVector(sm.right, lateral).add(new THREE.Vector3(0, 0, 0))
}

export function yawOnTrack(track: Track, s: number): number {
  const t = clamp(s / track.length, 0, 1)
  const idx = clamp(Math.round(t * (track.samples.length - 1)), 0, track.samples.length - 1)
  const sm = track.samples[idx]
  return Math.atan2(sm.tangent.x, sm.tangent.z)
}
