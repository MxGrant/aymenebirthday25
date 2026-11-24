/**
 * Dev-only headless level runner.
 *
 * It drives a level with the same `stepCar` physics, the same track data and
 * the same fast-forward co-driver the game uses, then applies exactly the
 * arrival rules from DriveWorld (collectibles, gates, traffic contact, bay
 * detection). Used to play every stop end to end without a GPU; never
 * shipped in a production build.
 */
import { getLevel } from '../content/levels'
import { buildTrack, nearestOnTrack, pointOnTrack } from '../game/track'
import { createCarState, stepCar, type CarInput } from '../game/physics'
import { createAutopilot } from './autopilot'
import type { ParkStats } from '../game/runtime'

export interface SimTrace {
  t: number
  s: number
  lat: number
  v: number
  bayDist: number
  bumps: number
}

export interface SimResult extends ParkStats {
  parked: boolean
  reason: string
  bayDist: number
  trace: SimTrace[]
}

export function simulateLevel(levelId: number, maxSeconds = 420): SimResult {
  const level = getLevel(levelId)
  const track = buildTrack(level)
  const car = createCarState(track)
  const autopilot = createAutopilot(track)
  const input: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false }
  const dt = 1 / 60
  const collected: string[] = []
  let gates = 0
  let elapsed = 0
  let hint = -1
  let parkedTimer = 0
  let parked = false
  let reason = ''
  const trace: SimTrace[] = []
  let sampleIn = 0

  const traffic = Array.from({ length: level.traffic }, (_, i) => ({
    s: 70 + (i / Math.max(1, level.traffic)) * (track.length - 140),
    speed: 11 + (i % 4) * 2.5,
    lane: i % 2 === 0 ? track.halfRoad * 0.42 : -track.halfRoad * 0.42,
    dir: (i % 5 === 0 ? -1 : 1) as 1 | -1,
  }))
  const trafficPos = traffic.map(() => ({ x: 0, z: 0 }))

  while (elapsed < maxSeconds && !parked) {
    for (let i = 0; i < traffic.length; i++) {
      const t = traffic[i]
      t.s += t.speed * dt * t.dir
      if (t.s > track.length - 40) {
        t.s = 30
        t.dir = 1
      }
      if (t.s < 24) {
        t.s = track.length - 50
        t.dir = -1
      }
      const p = pointOnTrack(track, t.s, t.lane)
      trafficPos[i] = { x: p.x, z: p.z }
    }

    const hit = nearestOnTrack(track, car.position.x, car.position.z, hint)
    hint = hit.index
    Object.assign(input, autopilot(car, hit, trafficPos, collected, dt))
    stepCar(car, input, dt, track, hit, false)
    elapsed += dt

    // Traffic contact, identical to the live loop.
    for (const tp of trafficPos) {
      const dx = car.position.x - tp.x
      const dz = car.position.z - tp.z
      const d = Math.hypot(dx, dz)
      if (d < 2.6 && d > 0.001) {
        const nx = dx / d
        const nz = dz / d
        car.position.x += nx * (2.6 - d)
        car.position.z += nz * (2.6 - d)
        car.velocity.x *= 0.55
        car.velocity.y *= 0.55
        car.speed *= 0.6
        if (car.collisionFlash <= 0) {
          car.collisionFlash = 0.6
          car.collisions += 1
        }
      }
    }

    for (const item of track.collectibles) {
      if (collected.includes(item.id)) continue
      const dx = item.position.x - car.position.x
      const dz = item.position.z - car.position.z
      if (dx * dx + dz * dz < 9) collected.push(item.id)
    }

    if (gates < track.gates.length) {
      const g = track.gates[gates]
      if (hit.s >= g.s && Math.abs(hit.lateral) < track.halfRoad + 8) gates += 1
    }

    sampleIn += dt
    if (sampleIn >= 1) {
      sampleIn = 0
      trace.push({
        t: Math.round(elapsed),
        s: Math.round(hit.s),
        lat: Math.round(hit.lateral * 10) / 10,
        v: Math.round(car.speed * 10) / 10,
        bayDist: Math.round(Math.hypot(car.position.x - track.station.bay.x, car.position.z - track.station.bay.z) * 10) / 10,
        bumps: car.collisions,
      })
      if (trace.length > 60) trace.shift()
    }

    if (hit.s > track.length - 26) {
      const bay = track.station.bay
      const dx = car.position.x - bay.x
      const dz = car.position.z - bay.z
      const cos = Math.cos(bay.yaw)
      const sin = Math.sin(bay.yaw)
      const lx = dx * cos - dz * sin
      const lz = dx * sin + dz * cos
      const inside = Math.abs(lx) < bay.halfW + 0.6 && Math.abs(lz) < bay.halfL + 0.6
      if (inside && Math.abs(car.speed) < 1.4) {
        parkedTimer += dt
        if (parkedTimer > 0.7) {
          parked = true
          car.velocity.set(0, 0)
          car.speed = 0
        }
      } else {
        parkedTimer = 0
      }
    }
  }

  let objectiveMet = true
  const objective = level.objective
  if (!parked) {
    objectiveMet = false
    reason = `Did not reach the bay within ${maxSeconds}s (at ${Math.round(hitProgress(track, car.position.x, car.position.z))}m of ${track.length}m).`
  } else if (objective.type === 'timed' && elapsed > (objective.timeLimit ?? 999)) {
    objectiveMet = false
    reason = `Arrived in ${elapsed.toFixed(1)}s, limit ${objective.timeLimit}s.`
  } else if (objective.type === 'collect' && collected.length < (objective.collectCount ?? 0)) {
    objectiveMet = false
    reason = `Found ${collected.length} of ${objective.collectCount} collectibles.`
  } else if ((objective.type === 'clean' || objective.type === 'precision') && car.collisions > (objective.maxCollisions ?? 0)) {
    objectiveMet = false
    reason = `${car.collisions} bumps, limit ${objective.maxCollisions ?? 0}.`
  } else if (objective.type === 'checkpoints' && gates < (objective.gateCount ?? 0)) {
    objectiveMet = false
    reason = `Passed ${gates} of ${objective.gateCount} gates.`
  }

  return {
    time: elapsed,
    collisions: car.collisions,
    collected,
    gates,
    totalCollectibles: track.collectibles.length,
    objectiveMet,
    failureReason: reason,
    parked,
    reason,
    bayDist: Math.round(Math.hypot(car.position.x - track.station.bay.x, car.position.z - track.station.bay.z) * 10) / 10,
    trace,
  }
}

function hitProgress(track: ReturnType<typeof buildTrack>, x: number, z: number) {
  return nearestOnTrack(track, x, z).s
}
