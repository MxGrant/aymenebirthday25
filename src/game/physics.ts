import * as THREE from 'three'
import { clamp, lerp } from './rng'
import type { Collider, Track, TrackHit } from './track'

export interface CarInput {
  throttle: number
  brake: number
  steer: number
  handbrake: boolean
  nitro: boolean
}

export const emptyInput = (): CarInput => ({
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  nitro: false,
})

export interface CarState {
  position: THREE.Vector3
  yaw: number
  velocity: THREE.Vector2
  speed: number
  lateral: number
  steerAngle: number
  yawRate: number
  nitro: number
  boosting: boolean
  gear: number
  rpm: number
  wheelSpin: number
  pitch: number
  roll: number
  collisions: number
  collisionFlash: number
  offRoad: boolean
  lastSurface: 'road' | 'grass'
  reversing: boolean
  topSpeed: number
}

export interface StepEvent {
  collided: boolean
  impact: number
  offRoad: boolean
}

const WHEELBASE = 2.72

export function createCarState(track: Track): CarState {
  return {
    position: track.start.position.clone(),
    yaw: track.start.yaw,
    velocity: new THREE.Vector2(0, 0),
    speed: 0,
    lateral: 0,
    steerAngle: 0,
    yawRate: 0,
    nitro: 100,
    boosting: false,
    gear: 1,
    rpm: 0.12,
    wheelSpin: 0,
    pitch: 0,
    roll: 0,
    collisions: 0,
    collisionFlash: 0,
    offRoad: false,
    lastSurface: 'road',
    reversing: false,
    topSpeed: 53 + (track.level.surface === 'circuit' ? 18 : 0) + (track.level.surface === 'motorway' ? 9 : 0) + (track.level.id % 4) * 2,
  }
}

export function stepCar(
  state: CarState,
  input: CarInput,
  dt: number,
  track: Track,
  trackHit: TrackHit,
  parkLock: boolean,
): StepEvent {
  const capped = Math.min(dt, 1 / 30)
  const event: StepEvent = { collided: false, impact: 0, offRoad: false }

  // Surfaces -------------------------------------------------------------
  const inStationArea = trackHit.s > track.length - 2 && trackHit.lateral > -40 && trackHit.lateral < 45
  const onRoad = Math.abs(trackHit.lateral) <= track.halfRoad + 0.6 || inStationArea
  const offRoad = !onRoad
  state.offRoad = offRoad
  event.offRoad = offRoad

  const surfaceGrip = offRoad ? 0.62 : 1
  const surfaceDrag = offRoad ? 5.2 : 0

  // Longitudinal axis ----------------------------------------------------
  let fwd = new THREE.Vector2(Math.sin(state.yaw), Math.cos(state.yaw))
  const right = new THREE.Vector2(-Math.cos(state.yaw), Math.sin(state.yaw))
  let vF = state.velocity.dot(fwd)
  let vL = state.velocity.dot(right)

  const throttle = parkLock ? 0 : clamp(input.throttle, 0, 1)
  const brake = parkLock ? 1 : clamp(input.brake, 0, 1)
  const steerInput = parkLock ? 0 : clamp(input.steer, -1, 1)

  state.boosting = input.nitro && state.nitro > 4 && !parkLock && vF > 2
  if (state.boosting) {
    state.nitro = Math.max(0, state.nitro - 26 * capped)
  } else {
    state.nitro = Math.min(100, state.nitro + 5.5 * capped)
  }

  const speedRatio = clamp(Math.abs(vF) / state.topSpeed, 0, 1)
  let accel = 0
  if (throttle > 0.01) {
    const powerCurve = 1 - speedRatio * speedRatio * 0.78
    accel += throttle * (state.boosting ? 30 : 19) * powerCurve
  }
  if (brake > 0.01) {
    if (vF > 0.8) {
      accel -= brake * 18
    } else {
      // reverse gear
      accel -= brake * 7
    }
  }
  // Engine braking / drag
  accel -= vF * 0.08
  accel -= vF * Math.abs(vF) * 0.0004
  if (offRoad) accel -= Math.sign(vF) * surfaceDrag

  vF += accel * capped
  const hardMax = state.topSpeed * (state.boosting ? 1.24 : 1) * (offRoad ? 0.5 : 1)
  vF = clamp(vF, -13, hardMax)
  state.reversing = vF < -0.4

  // Steering -------------------------------------------------------------
  const steerLimit = 0.62 * (1 - 0.58 * clamp(Math.abs(vF) / 42, 0, 1))
  const targetSteer = steerInput * steerLimit
  state.steerAngle = lerp(state.steerAngle, targetSteer, 1 - Math.exp(-9 * capped))

  // Recompose velocity in the current heading before rotating the car.
  state.velocity.set(fwd.x * vF + right.x * vL, fwd.y * vF + right.y * vL)

  const handbrake = input.handbrake && !parkLock
  // Tyre grip limits how fast the car can actually rotate: cap yaw rate by a
  // maximum lateral acceleration so high-speed cornering stays believable.
  const maxLatAccel = (handbrake ? 17 : 13.5) * surfaceGrip
  const yawCap = maxLatAccel / Math.max(4, Math.abs(vF))
  // Positive steering = turn right, so yaw decreases (right-handed Y-up).
  let yawRateTarget = -(vF / WHEELBASE) * Math.tan(state.steerAngle)
  yawRateTarget = clamp(yawRateTarget, -yawCap, yawCap)
  if (handbrake) yawRateTarget *= 1.35
  if (offRoad) yawRateTarget *= 0.9
  const yawResponse = handbrake ? 7.5 : 10.5
  state.yawRate = lerp(state.yawRate, yawRateTarget, 1 - Math.exp(-yawResponse * capped))
  if (Math.abs(vF) < 0.35) state.yawRate *= 0.72
  state.yaw += state.yawRate * capped

  // Tyre grip: decompose the world velocity in the NEW heading. The lateral
  // component is what grip eats, so a handbrake produces a genuine slide.
  fwd = new THREE.Vector2(Math.sin(state.yaw), Math.cos(state.yaw))
  const right2 = new THREE.Vector2(-Math.cos(state.yaw), Math.sin(state.yaw))
  let vF2 = state.velocity.dot(fwd)
  let vL2 = state.velocity.dot(right2)
  const latGrip = (handbrake ? 1.15 : 9.2) * surfaceGrip * (1 - 0.35 * clamp(Math.abs(vF2) / state.topSpeed, 0, 1))
  vL2 *= Math.exp(-latGrip * capped)
  if (Math.abs(vL2) < 0.02) vL2 = 0
  state.lateral = vL2
  state.speed = vF2
  state.velocity.set(fwd.x * vF2 + right2.x * vL2, fwd.y * vF2 + right2.y * vL2)

  // Integrate ------------------------------------------------------------
  state.position.x += state.velocity.x * capped
  state.position.z += state.velocity.y * capped

  // Collisions with scenery ---------------------------------------------
  const carRadius = 1.75
  const nearby = track.colliders
  for (let i = 0; i < nearby.length; i++) {
    const c = nearby[i]
    const dx = state.position.x - c.x
    const dz = state.position.z - c.z
    const minDist = c.r + carRadius
    const d2 = dx * dx + dz * dz
    if (d2 < minDist * minDist && d2 > 0.0001) {
      const d = Math.sqrt(d2)
      const nx = dx / d
      const nz = dz / d
      const push = minDist - d
      state.position.x += nx * push
      state.position.z += nz * push
      const vn = state.velocity.x * nx + state.velocity.y * nz
      if (vn < 0) {
        state.velocity.x -= vn * nx * 1.25
        state.velocity.y -= vn * nz * 1.25
        const impact = Math.abs(vn)
        state.speed *= 0.55
        state.velocity.multiplyScalar(0.72)
        if (impact > 1.4 && state.collisionFlash <= 0) {
          state.collisions += 1
          state.collisionFlash = 0.55
          event.collided = true
          event.impact = impact
        }
      }
    }
  }

  // Track boundary cushion: deep off-road driving gets dragged back toward the road
  if (offRoad && Math.abs(trackHit.lateral) > track.halfRoad + 26) {
    const dir = Math.sign(trackHit.lateral)
    state.position.addScaledVector(trackHit.right, -dir * 8 * capped)
  }

  // Place the car on the road surface
  state.position.y = trackHit.y + 0.02

  // Suspension / visual attitude ----------------------------------------
  const targetPitch = clamp(-accel * 0.0075, -0.05, 0.05)
  const targetRoll = clamp(state.yawRate * Math.abs(vF2) * 0.0045, -0.075, 0.075)
  state.pitch = lerp(state.pitch, targetPitch, 1 - Math.exp(-6 * capped))
  state.roll = lerp(state.roll, targetRoll, 1 - Math.exp(-6 * capped))

  // Drivetrain visuals ---------------------------------------------------
  const absSpeed = Math.abs(vF2)
  state.wheelSpin += (vF2 / 0.36) * capped
  const gearThresholds = [0, 8, 17, 27, 38, 49, 61, 74]
  let gear = 1
  for (let g = 1; g < gearThresholds.length; g++) {
    if (absSpeed > gearThresholds[g]) gear = g + 1
  }
  gear = clamp(gear, 1, 7)
  state.gear = state.reversing ? 0 : gear
  const lower = gearThresholds[Math.max(0, gear - 1)]
  const upper = gearThresholds[Math.min(gearThresholds.length - 1, gear)] ?? 80
  const band = Math.max(1, upper - lower)
  const targetRpm = clamp(0.18 + ((absSpeed - lower) / band) * 0.82 + (throttle > 0.1 ? 0.04 : 0), 0.1, 1)
  state.rpm = lerp(state.rpm, targetRpm, 1 - Math.exp(-8 * capped))

  state.collisionFlash = Math.max(0, state.collisionFlash - capped)

  return event
}

export function collidersNear(track: Track, x: number, z: number, radius: number): Collider[] {
  const out: Collider[] = []
  const r2 = radius * radius
  for (const c of track.colliders) {
    const dx = c.x - x
    const dz = c.z - z
    if (dx * dx + dz * dz < r2) out.push(c)
  }
  return out
}
