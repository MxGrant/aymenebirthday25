import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { DriveWorld } from '../three/DriveWorld'
import { HUD } from './HUD'
import { useGame } from '../game/store'
import { getLevel } from '../content/levels'
import { buildTrack } from '../game/track'
import { emptyInput } from '../game/physics'
import { makeTelemetry, type ParkStats } from '../game/runtime'
import { audio } from '../game/audio'
import { formatTime } from '../game/progress'
import type { CarInput } from '../game/physics'

function useTouch() {
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    const check = () => setTouch(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return touch
}

export function DriveScreen() {
  const levelId = useGame((s) => s.levelId)
  const settings = useGame((s) => s.settings)
  const setScreen = useGame((s) => s.setScreen)
  const enterStation = useGame((s) => s.enterStation)
  const setPendingStats = useGame((s) => s.setPendingStats)
  const pushToast = useGame((s) => s.pushToast)
  const level = useMemo(() => getLevel(levelId), [levelId])
  const track = useMemo(() => buildTrack(level), [level.id])
  const telemetry = useRef(makeTelemetry())
  const input = useRef<CarInput>(emptyInput())
  const [paused, setPaused] = useState(false)
  const [cinematic, setCinematic] = useState(false)
  const [stats, setStats] = useState<ParkStats | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [showIntro, setShowIntro] = useState(true)
  const [collected, setCollected] = useState<string[]>([])
  const touch = useTouch()
  const statsRef = useRef<ParkStats | null>(null)
  statsRef.current = stats

  telemetry.current.total = track.collectibles.length

  useEffect(() => {
    audio.startMusic('drive')
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 9000)
    return () => window.clearTimeout(timer)
  }, [levelId])

  const restart = () => {
    telemetry.current = makeTelemetry()
    telemetry.current.total = track.collectibles.length
    input.current = emptyInput()
    setStats(null)
    setCollected([])
    setPaused(false)
    setShowIntro(true)
    setRunKey((k) => k + 1)
    audio.play('confirm')
  }

  const goToStation = () => {
    const s = statsRef.current
    if (!s || !s.objectiveMet) return
    setPendingStats(s)
    enterStation(level.id)
    audio.play('door')
    audio.startMusic('station')
  }

  // Dev-only hook so automated playthroughs can raise the arrival card that a
  // completed drive produces. Never present in a production build.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__aymeneDrive = { arrive: (s: ParkStats) => setStats(s) }
    return () => {
      delete w.__aymeneDrive
    }
  }, [])

  useEffect(() => {
    const keys = new Set<string>()
    const sync = () => {
      const k = keys
      const throttle = k.has('KeyW') || k.has('ArrowUp') ? 1 : 0
      const brake = k.has('KeyS') || k.has('ArrowDown') ? 1 : 0
      let steer = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
      steer *= settings.sensitivity * (settings.invertSteer ? -1 : 1)
      input.current.throttle = throttle
      input.current.brake = brake
      input.current.steer = Math.max(-1, Math.min(1, steer))
      input.current.handbrake = k.has('Space')
      input.current.nitro = k.has('ShiftLeft') || k.has('ShiftRight')
    }
    const down = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
      if (e.repeat) {
        keys.add(e.code)
        sync()
        return
      }
      keys.add(e.code)
      sync()
      if (e.code === 'Escape') setPaused((p) => !p)
      if (e.code === 'KeyC') setCinematic((c) => !c)
      if (e.code === 'KeyE' && statsRef.current?.objectiveMet) goToStation()
      if (e.code === 'KeyR' && statsRef.current && !statsRef.current.objectiveMet) restart()
    }
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code)
      sync()
    }
    const blur = () => {
      keys.clear()
      sync()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [settings.sensitivity, settings.invertSteer])

  const bindHold = (apply: (on: boolean) => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      apply(true)
    },
    onPointerUp: () => apply(false),
    onPointerCancel: () => apply(false),
    onPointerLeave: () => apply(false),
  })

  return (
    <div className="drive-root">
      <Canvas
        key={runKey}
        dpr={[1, settings.graphics === 'low' ? 1 : settings.graphics === 'medium' ? 1.4 : 1.8]}
        gl={{ antialias: settings.graphics !== 'low', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ fov: 54, near: 0.3, far: 1800, position: [0, 4, -10] }}
      >
        <Suspense fallback={null}>
          <DriveWorld
            level={level}
            track={track}
            settings={settings}
            inputRef={input}
            telemetry={telemetry}
            paused={paused || Boolean(stats)}
            cinematic={cinematic}
            onParked={(s) => {
              setStats(s)
              audio.play(s.objectiveMet ? 'levelComplete' : 'deny')
            }}
            onCollect={(id) => {
              setCollected((prev) => [...prev, id])
              if (collected.length + 1 === track.collectibles.length) pushToast({ title: 'FULL HOUSE', text: 'Every collectible on this stop found.', kind: 'collect' })
            }}
            onGate={() => pushToast({ title: 'CHECKPOINT', text: 'Gate cleared. Keep it tidy.', kind: 'info' })}
            onCollision={() => undefined}
          />
        </Suspense>
      </Canvas>

      <HUD telemetry={telemetry} level={level} track={track} settings={settings} paused={paused || Boolean(stats)} onPause={() => setPaused(true)} />

      {showIntro && !stats && (
        <div className="level-intro-card">
          <span className="micro-label">STOP {String(level.id).padStart(2, '0')} · {level.section.toUpperCase()}</span>
          <h2>{level.name}</h2>
          <p className="level-intro-tag">{level.tagline}</p>
          <p className="level-intro-obj">{level.objective.detail}</p>
          <div className="level-intro-foot">
            <span>{level.objective.label}</span>
            <button className="btn btn--ghost" onClick={() => setShowIntro(false)}>DISMISS</button>
          </div>
        </div>
      )}

      {cinematic && !stats && <div className="cine-badge">CINEMATIC CAMERA</div>}

      {touch && !stats && !paused && (
        <div className="touch-controls">
          <div className="touch-left">
            <button className="tbtn tbtn--steer" {...bindHold((on) => { input.current.steer = on ? -settings.sensitivity * (settings.invertSteer ? -1 : 1) : 0 })}>◀</button>
            <button className="tbtn tbtn--steer" {...bindHold((on) => { input.current.steer = on ? settings.sensitivity * (settings.invertSteer ? -1 : 1) : 0 })}>▶</button>
          </div>
          <div className="touch-right">
            <button className="tbtn tbtn--nitro" {...bindHold((on) => { input.current.nitro = on })}>N₂O</button>
            <button className="tbtn tbtn--drift" {...bindHold((on) => { input.current.handbrake = on })}>DRIFT</button>
            <button className="tbtn tbtn--brake" {...bindHold((on) => { input.current.brake = on ? 1 : 0 })}>▼</button>
            <button className="tbtn tbtn--gas" {...bindHold((on) => { input.current.throttle = on ? 1 : 0 })}>▲</button>
          </div>
        </div>
      )}

      {paused && !stats && (
        <div className="modal-backdrop">
          <div className="modal pause-modal">
            <span className="micro-label">PAUSED</span>
            <h2>ENGINE IDLING</h2>
            <p>Stop {String(level.id).padStart(2, '0')} · {level.name}</p>
            <div className="modal-actions">
              <button className="btn btn--primary" onClick={() => { audio.play('click'); setPaused(false) }}>RESUME DRIVING</button>
              <button className="btn" onClick={restart}>RESTART STOP</button>
              <button className="btn" onClick={() => { audio.play('click'); setCinematic((c) => !c) }}>
                {cinematic ? 'CHASE CAMERA' : 'CINEMATIC CAMERA'}
              </button>
              <button className="btn btn--ghost" onClick={() => { setScreen('menu'); audio.startMusic('menu') }}>MAIN MENU</button>
            </div>
            <p className="modal-note">Progress saves automatically. The car will wait.</p>
          </div>
        </div>
      )}

      {stats && (
        <div className="modal-backdrop">
          <div className={`modal arrival-modal ${stats.objectiveMet ? 'is-success' : 'is-fail'}`}>
            <span className="micro-label">{stats.objectiveMet ? 'ARRIVAL CONFIRMED' : 'OBJECTIVE INCOMPLETE'}</span>
            <h2>{stats.objectiveMet ? `WELCOME TO STOP ${String(level.id).padStart(2, '0')}` : 'CHALLENGE NOT COMPLETE'}</h2>
            <p className="arrival-station">{level.station.name}</p>
            <p className="arrival-tagline">{stats.objectiveMet ? 'A little piece of the journey.' : stats.failureReason}</p>

            <div className="arrival-stats">
              <div><span>TIME</span><strong>{formatTime(stats.time)}</strong></div>
              <div><span>COLLECTED</span><strong>{stats.collected.length}/{stats.totalCollectibles}</strong></div>
              <div><span>BUMPS</span><strong>{stats.collisions}</strong></div>
              {stats.gates > 0 && <div><span>GATES</span><strong>{stats.gates}</strong></div>}
            </div>

            <div className="modal-actions">
              {stats.objectiveMet ? (
                <>
                  <button className="btn btn--primary" onClick={goToStation} autoFocus>
                    ENTER STATION {touch ? '' : '(E)'}
                  </button>
                  <button className="btn btn--ghost" onClick={() => { setScreen('menu'); audio.startMusic('menu') }}>MAIN MENU</button>
                </>
              ) : (
                <>
                  <button className="btn btn--primary" onClick={restart}>RETRY STOP {touch ? '' : '(R)'}</button>
                  <button className="btn btn--ghost" onClick={() => { setScreen('menu'); audio.startMusic('menu') }}>MAIN MENU</button>
                </>
              )}
            </div>
            {stats.objectiveMet && <p className="modal-note">The station is open. Its photo wall is waiting.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
