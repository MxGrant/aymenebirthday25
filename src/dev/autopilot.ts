/**
 * Automated co-driver used for end-to-end playtests in `npm run dev`.
 *
 * It only ever returns a CarInput — exactly what the keyboard and the touch
 * buttons produce — so a run exercises the real handling, traffic, parking
 * detection, station hand-off and progression. It is loaded through a
 * `import.meta.env.DEV` guard so it never ships in a production build.
 */
import type { CarInput, CarState } from '../game/physics'
import type { Track, TrackHit } from '../game/track'
import { pointOnTrack } from '../game/track'
import { clamp } from '../game/rng'

type TrafficPos = { x: number; z: number }

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function createAutopilot(track: Track) {
  const n = track.samples.length
  const ds = track.length / Math.max(1, n - 1)

  // Corner speed limit per sample, then a backwards braking pass so the car
  // brakes before the bend instead of discovering it at speed. Narrow roads
  // get a lower lateral limit so the car does not run wide into the scenery.
  const plan = new Float32Array(n)
  const grip = clamp(track.halfRoad / 8, 0.5, 1)
  const latAccel = 10.2 * grip
  for (let i = 0; i < n; i++) {
    const a = track.samples[Math.max(0, i - 1)].tangent
    const b = track.samples[Math.min(n - 1, i + 1)].tangent
    const ang = Math.acos(clamp(a.dot(b), -1, 1))
    const kappa = ang / Math.max(0.001, 2 * ds)
    plan[i] = kappa > 1e-4 ? Math.min(58, Math.sqrt(latAccel / kappa)) : 58
  }
  for (let i = n - 2; i >= 0; i--) {
    plan[i] = Math.min(plan[i], Math.sqrt(plan[i + 1] * plan[i + 1] + 2 * 8.4 * ds))
  }

  const bay = track.station.bay
  const baySin = Math.sin(bay.yaw)
  const bayCos = Math.cos(bay.yaw)
  const wantsCollect = track.level.objective.type === 'collect'
  const laneRoom = Math.max(1.8, Math.min(4.2, track.halfRoad * 0.7))
  let stuckFor = 0
  let reverseFor = 0
  let prevS = 0

  return (c: CarState, hit: TrackHit, traffic: TrafficPos[], collected: string[], dt: number): Partial<CarInput> => {
    if (!Number.isFinite(hit.s) || !Number.isFinite(c.speed) || !Number.isFinite(c.position.x)) {
      return { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false }
    }
    const speed = Math.abs(c.speed)
    const bayDist = Math.hypot(bay.x - c.position.x, bay.z - c.position.z)
    const parking = bayDist < 62 || hit.s > track.length - 62

    let aimX: number
    let aimZ: number
    let targetSpeed: number

    if (parking) {
      // Line up with the bay and roll to a stop on the marks.
      if (bayDist > 6) {
        aimX = bay.x
        aimZ = bay.z
      } else {
        aimX = c.position.x + baySin * 10
        aimZ = c.position.z + bayCos * 10
      }
      const stopDist = Math.max(0, bayDist - 0.9)
      targetSpeed = Math.min(14, Math.sqrt(2 * 3.4 * stopDist))
    } else {
      const look = 5.5 + speed * 0.36
      let lateral = 0
      let directX: number | null = null
      let directZ = 0

      // Collectibles: aim straight at the next one that has not been taken.
      if (wantsCollect) {
        let bestD = Infinity
        for (const item of track.collectibles) {
          if (collected.includes(item.id)) continue
          const ahead = item.s - hit.s
          if (ahead < -8 || ahead > 90) continue
          const d = Math.hypot(item.position.x - c.position.x, item.position.z - c.position.z)
          if (d < bestD) {
            bestD = d
            directX = item.position.x
            directZ = item.position.z
          }
        }
      }

      if (directX === null) {
        // Traffic: nudge around anything sitting in our lane ahead.
        const rightX = -Math.cos(c.yaw)
        const rightZ = Math.sin(c.yaw)
        const fwdX = Math.sin(c.yaw)
        const fwdZ = Math.cos(c.yaw)
        let nearest = Infinity
        for (const t of traffic) {
          const dx = t.x - c.position.x
          const dz = t.z - c.position.z
          const ahead = dx * fwdX + dz * fwdZ
          if (ahead < 4 || ahead > 42) continue
          const side = dx * rightX + dz * rightZ
          if (Math.abs(side) > 3.2) continue
          if (ahead < nearest) {
            nearest = ahead
            lateral = side >= 0 ? -laneRoom : laneRoom
          }
        }
      }

      const p = pointOnTrack(
        track,
        Math.min(track.length, hit.s + look),
        clamp(lateral, -track.halfRoad + 1.4, track.halfRoad - 1.4),
      )
      aimX = directX ?? p.x
      aimZ = directX === null ? p.z : directZ
      const idx = clamp(Math.round((hit.s / track.length) * (n - 1)), 0, n - 1)
      targetSpeed = directX === null ? plan[idx] : Math.min(plan[idx], 27)
    }

    const desiredYaw = Math.atan2(aimX - c.position.x, aimZ - c.position.z)
    // Positive steer input turns the car right, i.e. decreases yaw.
    let steer = clamp(-wrap(desiredYaw - c.yaw) * 1.55, -1, 1)

    let throttle = 0
    let brake = 0
    if (targetSpeed < 0.2) {
      brake = speed > 1.1 ? 0.6 : 0
    } else if (speed > targetSpeed + 0.2) {
      brake = clamp((speed - targetSpeed) * 0.5, 0.2, 1)
    } else if (speed < targetSpeed - 1.4) {
      throttle = 1
    } else if (speed < targetSpeed - 0.2) {
      throttle = 0.45
    }

    // Recovery: if the car is wedged, back out and try again. Never while
    // creeping into the parking bay.
    if (parking) {
      stuckFor = 0
      reverseFor = 0
    } else {
      if (hit.s > prevS + 0.8) {
        prevS = hit.s
        stuckFor = 0
      } else if (speed < 0.6 && targetSpeed > 2) {
        stuckFor += dt
      } else {
        stuckFor = Math.max(0, stuckFor - dt)
      }
      if (stuckFor > 1.6) {
        reverseFor = 1.1
        stuckFor = 0
      }
      if (reverseFor > 0) {
        reverseFor -= dt
        throttle = 0
        brake = 1
        steer = -steer
      }
    }

    return { throttle, brake, steer, handbrake: false, nitro: false }
  }
}
