import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CarModel, type CarVisual } from './CarModel'
import { SkyDome } from './world/Sky'
import { Road } from './world/Road'
import { Scenery } from './world/Scenery'
import { Station } from './world/Station'
import { Collectibles, Gates, Rain, Traffic } from './world/Interactive'
import { paletteFor } from '../game/themes'
import { createCarState, stepCar, type CarInput, type CarState } from '../game/physics'
import { nearestOnTrack, pointOnTrack, type Track } from '../game/track'
import { audio } from '../game/audio'
import type { LevelSpec, Settings } from '../game/types'
import type { ParkStats, Telemetry } from '../game/runtime'
import { clamp } from '../game/rng'

/**
 * Frame delta in seconds, sanitised. A negative or non-finite delta (system
 * clock jump, tab restore, odd browser) used to run the physics backwards and
 * poison the whole car state with NaN, freezing the game for good.
 */
function frameDelta(raw: number) {
  if (!Number.isFinite(raw)) return 0
  return Math.min(Math.max(raw, 0), 0.05)
}

interface Props {
  level: LevelSpec
  track: Track
  settings: Settings
  inputRef: React.MutableRefObject<CarInput>
  telemetry: React.MutableRefObject<Telemetry>
  paused: boolean
  cinematic: boolean
  onParked: (stats: ParkStats) => void
  onCollect: (id: string) => void
  onGate: () => void
  onCollision: () => void
}

function CameraRig({
  car,
  parked,
  settings,
  cinematic,
}: {
  car: React.MutableRefObject<ReturnType<typeof createCarState>>
  parked: React.MutableRefObject<boolean>
  settings: Settings
  cinematic: boolean
}) {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 1, 0))
  const initialized = useRef(false)
  const orbit = useRef(0)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, rawDt) => {
    const dt = frameDelta(rawDt)
    const c = car.current
    fwd.set(Math.sin(c.yaw), 0, Math.cos(c.yaw))
    const speedT = clamp(Math.abs(c.speed) / 40, 0, 1)
    const isParked = parked.current
    orbit.current += dt

    if (isParked) {
      const radius = 8.5 + Math.sin(orbit.current * 0.5) * 0.8
      const angle = c.yaw + Math.PI * 0.55 + orbit.current * 0.32
      desired.set(c.position.x + Math.sin(angle) * radius, c.position.y + 2.4, c.position.z + Math.cos(angle) * radius)
      target.set(c.position.x, c.position.y + 0.85, c.position.z)
      camera.position.lerp(desired, 1 - Math.exp(-2.4 * dt))
      look.current.lerp(target, 1 - Math.exp(-3.5 * dt))
      camera.lookAt(look.current)
      const cam = camera as THREE.PerspectiveCamera
      cam.fov += (46 - cam.fov) * (1 - Math.exp(-3 * dt))
      cam.updateProjectionMatrix()
      return
    }

    if (cinematic) {
      const radius = (13 + speedT * 4) * settings.cameraDistance
      const angle = c.yaw + Math.PI * 0.8 + orbit.current * 0.22
      desired.set(c.position.x + Math.sin(angle) * radius, c.position.y + 4.2, c.position.z + Math.cos(angle) * radius)
      target.set(c.position.x, c.position.y + 1, c.position.z)
      camera.position.lerp(desired, 1 - Math.exp(-2.2 * dt))
      look.current.lerp(target, 1 - Math.exp(-4 * dt))
      camera.lookAt(look.current)
      const cam = camera as THREE.PerspectiveCamera
      cam.fov += (58 - cam.fov) * (1 - Math.exp(-3 * dt))
      cam.updateProjectionMatrix()
      return
    }

    const dist = (8.3 + speedT * 3.1) * settings.cameraDistance
    const height = 3.05 + speedT * 0.55
    desired.set(c.position.x - fwd.x * dist, c.position.y + height, c.position.z - fwd.z * dist)
    if (desired.y < c.position.y + 1.3) desired.y = c.position.y + 1.3
    target.set(c.position.x + fwd.x * 7.5, c.position.y + 1.15, c.position.z + fwd.z * 7.5)

    if (!initialized.current) {
      camera.position.copy(desired)
      look.current.copy(target)
      initialized.current = true
    }
    camera.position.lerp(desired, 1 - Math.exp(-5.2 * dt))
    look.current.lerp(target, 1 - Math.exp(-7 * dt))
    camera.lookAt(look.current)

    const cam = camera as THREE.PerspectiveCamera
    const targetFov = 54 + speedT * 16 + (c.boosting ? 4 : 0)
    cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-4 * dt))
    cam.updateProjectionMatrix()
  })

  return null
}

export function DriveWorld(props: Props) {
  const { level, track, settings, inputRef, telemetry, paused, cinematic, onParked, onCollect, onGate, onCollision } = props
  const palette = useMemo(() => paletteFor(level), [level])
  const car = useRef(createCarState(track))
  const carGroup = useRef<THREE.Group>(null)
  const visual = useRef<CarVisual>({ steer: 0, spin: 0, brake: false, boosting: false, throttle: 0, lightsOn: true })
  const hitHint = useRef(-1)
  const elapsed = useRef(0)
  const collected = useRef<string[]>([])
  const gatesPassed = useRef(0)
  const parked = useRef(false)
  const parkedTimer = useRef(0)
  const reported = useRef(false)
  const trafficPositions = useRef<{ x: number; z: number }[]>([])
  const trafficActive = useRef(false)
  const audioTick = useRef(0)
  const [, forceHud] = useState(0)
  const arriveRef = useRef(false)
  const lastHit = useRef<ReturnType<typeof nearestOnTrack> | null>(null)
  const boostLatch = useRef(false)

  // Dev-only QA hook: a co-driver plus state probe for automated playtests.
  const autoRef = useRef(false)
  const autopilotRef = useRef<
    | ((
        car: CarState,
        hit: ReturnType<typeof nearestOnTrack>,
        traffic: { x: number; z: number }[],
        collected: string[],
        dt: number,
      ) => Partial<CarInput>)
    | null
  >(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let cancelled = false
    import('../dev/autopilot').then((mod) => {
      if (cancelled) return
      autopilotRef.current = mod.createAutopilot(track)
      ;(window as unknown as Record<string, unknown>).__aymeneQA = {
        setAuto: (on: boolean) => {
          autoRef.current = Boolean(on)
        },
        snapshot: () => {
          const c = car.current
          const s = lastHit.current?.s ?? 0
          const aim = pointOnTrack(track, Math.min(track.length, s + 12))
          const ahead: [number, number][] = []
          for (let d = 0; d <= 200; d += 8) {
            const p = pointOnTrack(track, Math.min(track.length, s + d))
            ahead.push([p.x, p.z])
          }
          const objective = level.objective
          return {
            auto: autoRef.current,
            parked: parked.current,
            s,
            length: track.length,
            speed: c.speed,
            collisions: c.collisions,
            time: elapsed.current,
            collected: collected.current.length,
            x: c.position.x,
            z: c.position.z,
            yaw: c.yaw,
            aimX: aim.x,
            aimZ: aim.z,
            bayX: track.station.bay.x,
            bayZ: track.station.bay.z,
            bayYaw: track.station.bay.yaw,
            halfRoad: track.halfRoad,
            gatesPassed: gatesPassed.current,
            objective: {
              type: objective.type,
              collectCount: objective.collectCount ?? null,
              timeLimit: objective.timeLimit ?? null,
              maxCollisions: objective.maxCollisions ?? null,
              gateCount: objective.gateCount ?? null,
            },
            ahead,
            traffic: trafficPositions.current.map((t) => [t.x, t.z]),
            items: track.collectibles
              .filter((it) => !collected.current.includes(it.id))
              .map((it) => [it.position.x, it.position.z, it.s]),
          }
        },
      }
    })
    return () => {
      cancelled = true
      autopilotRef.current = null
      delete (window as unknown as Record<string, unknown>).__aymeneQA
    }
  }, [track])

  useEffect(() => {
    audio.startEngineSound()
    const t = window.setTimeout(() => audio.play('engineStart'), 260)
    return () => {
      window.clearTimeout(t)
      audio.stopEngineSound()
      audio.updateTyres(0)
    }
  }, [])

  const deliverPark = () => {
    if (reported.current) return
    reported.current = true
    const c = car.current
    const objective = level.objective
    let objectiveMet = true
    let reason = ''
    if (objective.type === 'timed' && elapsed.current > (objective.timeLimit ?? 999)) {
      objectiveMet = false
      reason = `You arrived in ${elapsed.current.toFixed(1)}s — the limit was ${objective.timeLimit}s.`
    }
    if (objective.type === 'collect' && collected.current.length < (objective.collectCount ?? 0)) {
      objectiveMet = false
      reason = `You needed ${objective.collectCount} collectibles and found ${collected.current.length}.`
    }
    if (objective.type === 'clean' && c.collisions > (objective.maxCollisions ?? 3)) {
      objectiveMet = false
      reason = `${c.collisions} bumps — the limit was ${objective.maxCollisions}.`
    }
    if (objective.type === 'precision' && c.collisions > (objective.maxCollisions ?? 0)) {
      objectiveMet = false
      reason = `${c.collisions} bumps — this challenge allowed ${objective.maxCollisions ?? 0}.`
    }
    if (objective.type === 'checkpoints' && gatesPassed.current < (objective.gateCount ?? 0)) {
      objectiveMet = false
      reason = `You passed ${gatesPassed.current} of ${objective.gateCount} checkpoints.`
    }
    audio.stopEngineSound()
    audio.play('park')
    onParked({
      time: elapsed.current,
      collisions: c.collisions,
      collected: [...collected.current],
      gates: gatesPassed.current,
      totalCollectibles: track.collectibles.length,
      objectiveMet,
      failureReason: reason,
    })
  }

  useFrame((state, rawDt) => {
    const dt = frameDelta(rawDt)
    const c = car.current
    const input = inputRef.current

    if (!paused) {
      if (!parked.current) elapsed.current += dt

      const hit = nearestOnTrack(track, c.position.x, c.position.z, hitHint.current)
      hitHint.current = hit.index
      lastHit.current = hit
      if (autoRef.current && autopilotRef.current && !parked.current) {
        Object.assign(input, autopilotRef.current(c, hit, trafficPositions.current, collected.current, dt))
      }

      const ev = stepCar(c, input, dt, track, hit, parked.current || arriveRef.current)

      if (ev.collided) {
        audio.play('collision')
        onCollision()
      }

      // Traffic contact: push the car out and scrub speed.
      for (const tp of trafficPositions.current) {
        const dx = c.position.x - tp.x
        const dz = c.position.z - tp.z
        const d = Math.hypot(dx, dz)
        if (d < 2.6 && d > 0.001) {
          const nx = dx / d
          const nz = dz / d
          c.position.x += nx * (2.6 - d)
          c.position.z += nz * (2.6 - d)
          c.velocity.x *= 0.55
          c.velocity.y *= 0.55
          c.speed *= 0.6
          if (c.collisionFlash <= 0) {
            c.collisionFlash = 0.6
            c.collisions += 1
            audio.play('collision')
            onCollision()
          }
        }
      }

      // Collectibles
      for (const item of track.collectibles) {
        if (collected.current.includes(item.id)) continue
        const dx = item.position.x - c.position.x
        const dz = item.position.z - c.position.z
        if (dx * dx + dz * dz < 9) {
          collected.current.push(item.id)
          audio.play('pickup')
          onCollect(item.id)
          forceHud((n) => n + 1)
        }
      }

      // Checkpoint gates
      if (gatesPassed.current < track.gates.length) {
        const g = track.gates[gatesPassed.current]
        if (hit.s >= g.s && Math.abs(hit.lateral) < track.halfRoad + 8) {
          gatesPassed.current += 1
          audio.play('gate')
          onGate()
          forceHud((n) => n + 1)
        }
      }

      // Parking
      if (!parked.current && hit.s > track.length - 26) {
        const bay = track.station.bay
        const dx = c.position.x - bay.x
        const dz = c.position.z - bay.z
        const cos = Math.cos(bay.yaw)
        const sin = Math.sin(bay.yaw)
        const lx = dx * cos - dz * sin
        const lz = dx * sin + dz * cos
        const inside = Math.abs(lx) < bay.halfW + 0.6 && Math.abs(lz) < bay.halfL + 0.6
        if (inside && Math.abs(c.speed) < 1.4) {
          parkedTimer.current += dt
          if (parkedTimer.current > 0.7) {
            parked.current = true
            arriveRef.current = true
            c.velocity.set(0, 0)
            c.speed = 0
            deliverPark()
          }
        } else {
          parkedTimer.current = 0
        }
      }

      // Audio
      audioTick.current += 1
      if (audioTick.current % 3 === 0) {
        audio.updateEngine({
          rpm: c.rpm,
          throttle: input.throttle,
          speed: Math.abs(c.speed),
          boosting: c.boosting,
          offRoad: c.offRoad,
          active: !parked.current,
        })
        audio.updateTyres(Math.min(1, Math.abs(c.lateral) / 7) + (input.handbrake && Math.abs(c.speed) > 6 ? 0.45 : 0))
        if (c.boosting && !boostLatch.current) {
          audio.play('nitro')
          boostLatch.current = true
        }
        if (!c.boosting) boostLatch.current = false
      }
    }

    // Car transform + suspension attitude
    const c2 = car.current
    if (carGroup.current) {
      carGroup.current.position.set(c2.position.x, c2.position.y, c2.position.z)
      carGroup.current.rotation.set(c2.pitch, c2.yaw, c2.roll)
    }
    const v = visual.current
    v.spin = c2.wheelSpin
    v.steer = clamp(c2.steerAngle / 0.6, -1, 1)
    v.brake = input.brake > 0.05 || parked.current
    v.boosting = c2.boosting
    v.throttle = input.throttle
    v.lightsOn = true

    // Telemetry for the HUD
    const t = telemetry.current
    t.speed = Math.abs(c2.speed) * 3.6
    t.gear = c2.gear
    t.rpm = c2.rpm
    t.nitro = c2.nitro
    t.boosting = c2.boosting
    t.progress = clamp((lastHit.current?.s ?? 0) / track.length, 0, 1)
    t.collected = collected.current.length
    t.total = track.collectibles.length
    t.time = elapsed.current
    t.timeLeft = level.objective.timeLimit ? Math.max(0, level.objective.timeLimit - elapsed.current) : null
    t.collisions = c2.collisions
    t.gates = gatesPassed.current
    t.gateTotal = track.gates.length
    t.offRoad = c2.offRoad
    t.drift = Math.abs(c2.lateral)
    t.reverse = c2.reversing
    t.parked = parked.current
    t.distance = t.progress * track.length

    // keep the world feeling alive even while parked
    if (parked.current) {
      state.camera.updateProjectionMatrix()
    }
  })

  const registerTraffic = (_cars: unknown, positions: { x: number; z: number }[]) => {
    trafficPositions.current = positions
    trafficActive.current = true
  }

  return (
    <>
      <SkyDome palette={palette} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.8} position={[0, 18, -18]} scale={[40, 14, 1]} color={palette.skyBottom} />
        <Lightformer intensity={1.2} position={[-18, 12, 12]} scale={[20, 10, 1]} color={palette.sunColor} />
        <Lightformer intensity={0.8} form="ring" position={[20, 8, 20]} scale={12} color={palette.hemiSky} />
      </Environment>

      <Road track={track} palette={palette} />
      <Scenery track={track} palette={palette} />
      <Station track={track} palette={palette} levelId={level.id} />
      <Collectibles track={track} collected={collected.current} />
      <Gates track={track} passed={gatesPassed.current} />
      <Rain palette={palette} active={level.weather === 'rain'} />
      {level.traffic > 0 && <Traffic track={track} count={level.traffic} register={registerTraffic} />}

      <group ref={carGroup}>
        <CarModel visual={visual} headlights />
      </group>

      <CameraRig car={car} parked={parked} settings={settings} cinematic={cinematic} />
    </>
  )
}
