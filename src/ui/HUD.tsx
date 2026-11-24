import { useEffect, useMemo, useState } from 'react'
import type { LevelSpec, Settings } from '../game/types'
import type { Telemetry } from '../game/runtime'
import type { Track } from '../game/track'

function Speedometer({ speed, gear, nitro, boosting, reverse }: { speed: number; gear: number; nitro: number; boosting: boolean; reverse: boolean }) {
  const max = 280
  const ratio = Math.min(1, speed / max)
  const needle = -120 + ratio * 240
  const ticks = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
    for (let i = 0; i <= 16; i++) {
      const a = ((-120 + (i / 16) * 240) * Math.PI) / 180
      const major = i % 4 === 0
      const r1 = major ? 66 : 71
      const r2 = 78
      out.push({
        x1: 100 + Math.sin(a) * r1,
        y1: 100 - Math.cos(a) * r1,
        x2: 100 + Math.sin(a) * r2,
        y2: 100 - Math.cos(a) * r2,
        major,
      })
    }
    return out
  }, [])

  return (
    <div className={`speedo ${boosting ? 'is-boosting' : ''}`}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id="speedArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d5c5a1" />
            <stop offset="60%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#a82430" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="rgba(8,9,12,0.55)" stroke="rgba(245,245,245,0.10)" strokeWidth="1" />
        <path d="M 100 100 m -80 0 a 80 80 0 1 1 160 0" fill="none" stroke="rgba(245,245,245,0.10)" strokeWidth="4" transform="rotate(150 100 100)" />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? 'rgba(245,245,245,0.7)' : 'rgba(245,245,245,0.25)'} strokeWidth={t.major ? 2 : 1} />
        ))}
        <path
          d="M 100 100 m -80 0 a 80 80 0 1 1 160 0"
          fill="none"
          stroke="url(#speedArc)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(ratio * 251.3).toFixed(1)} 502.6`}
          transform="rotate(150 100 100)"
        />
        <g transform={`rotate(${needle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="34" stroke="#a82430" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="5" fill="#d5c5a1" />
      </svg>
      <div className="speedo-readout">
        <div className="speedo-speed">
          {String(Math.round(speed)).padStart(3, '0')}
          <span>KM/H</span>
        </div>
        <div className="speedo-gear">{reverse ? 'R' : gear}</div>
      </div>
      <div className="nitro">
        <span className="nitro-label">N₂O</span>
        <div className="nitro-track">
          <div className={`nitro-fill ${boosting ? 'is-active' : ''}`} style={{ width: `${nitro}%` }} />
        </div>
      </div>
    </div>
  )
}

function Minimap({ track, progress }: { track: Track; progress: number }) {
  const path = useMemo(() => {
    if (!track.minimap.length) return ''
    return track.minimap.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x * 92 + 4).toFixed(2)} ${(p.y * 92 + 4).toFixed(2)}`).join(' ')
  }, [track])
  const idx = Math.min(track.minimap.length - 1, Math.max(0, Math.round(progress * (track.minimap.length - 1))))
  const dot = track.minimap[idx] ?? { x: 0.5, y: 0.5 }
  const station = track.minimap[track.minimap.length - 1] ?? { x: 0.9, y: 0.9 }
  return (
    <div className="minimap">
      <svg viewBox="0 0 100 100">
        <path d={path} fill="none" stroke="rgba(245,245,245,0.18)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path} fill="none" stroke="#d5c5a1" strokeWidth="1.4" strokeLinejoin="round" strokeDasharray="3 3" />
        <circle cx={station.x * 92 + 4} cy={station.y * 92 + 4} r="3.4" fill="#a82430" />
        <circle cx={dot.x * 92 + 4} cy={dot.y * 92 + 4} r="3.4" fill="#f5f5f5" />
        <circle cx={dot.x * 92 + 4} cy={dot.y * 92 + 4} r="6" fill="none" stroke="rgba(245,245,245,0.35)" strokeWidth="1" />
      </svg>
      <span className="minimap-label">ROUTE</span>
    </div>
  )
}

export function HUD({
  telemetry,
  level,
  track,
  settings,
  onPause,
  paused,
}: {
  telemetry: React.MutableRefObject<Telemetry>
  level: LevelSpec
  track: Track
  settings: Settings
  onPause: () => void
  paused: boolean
}) {
  const [t, setT] = useState<Telemetry>(() => ({ ...telemetry.current }))

  useEffect(() => {
    const id = window.setInterval(() => setT({ ...telemetry.current }), 90)
    return () => window.clearInterval(id)
  }, [telemetry])

  const objective = level.objective
  const showCollect = objective.type === 'collect' || track.collectibles.length > 0
  const collectTarget = objective.collectCount ?? track.collectibles.length

  return (
    <div className={`hud ${paused ? 'is-paused' : ''}`}>
      <div className="hud-objective">
        <div className="hud-objective-head">
          <span className="hud-stop">STOP {String(level.id).padStart(2, '0')}</span>
          <span className="hud-level-name">{level.name}</span>
          <span className="hud-section">{level.section.toUpperCase()}</span>
        </div>
        <p className="hud-task">{objective.label}</p>
        <div className="hud-bars">
          <div className="hud-meter">
            <span>ROUTE</span>
            <div><i style={{ width: `${Math.round(t.progress * 100)}%` }} /></div>
          </div>
          {showCollect && (
            <div className="hud-collect">
              <span>COLLECTED</span>
              <strong>
                {t.collected}
                <em>/{objective.type === 'collect' ? collectTarget : track.collectibles.length}</em>
              </strong>
            </div>
          )}
          {t.gateTotal > 0 && (
            <div className="hud-collect">
              <span>GATES</span>
              <strong>
                {t.gates}
                <em>/{t.gateTotal}</em>
              </strong>
            </div>
          )}
          {t.timeLeft !== null && (
            <div className={`hud-timer ${t.timeLeft < 15 ? 'is-urgent' : ''}`}>
              <span>TIME LEFT</span>
              <strong>
                {String(Math.floor(t.timeLeft / 60)).padStart(2, '0')}:{String(Math.floor(t.timeLeft % 60)).padStart(2, '0')}
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="hud-topright">
        <div className="hud-chip">{level.weather.toUpperCase()} · {level.timeOfDay.toUpperCase()}</div>
        <button className="hud-pause" onClick={onPause} aria-label="Pause">
          ❚❚
        </button>
      </div>

      <div className="hud-bottom">
        <Speedometer speed={t.speed} gear={t.gear} nitro={t.nitro} boosting={t.boosting} reverse={t.reverse} />
        <div className="hud-hint">
          {t.offRoad ? <span className="warn">OFF ROAD — GRIP LOW</span> : <span>{settings.subtitles ? 'DRIVE TO THE ILLUMINATED BAY AT STOP ' + String(level.id).padStart(2, '0') : ''}</span>}
          <span className="hud-keys">WASD · SPACE DRIFT · SHIFT NITRO · C CINEMATIC · ESC PAUSE</span>
        </div>
        <div className="hud-right">
          <div className="hud-bumps">
            <span>BUMPS</span>
            <strong>{t.collisions}</strong>
          </div>
          <Minimap track={track} progress={t.progress} />
        </div>
      </div>
    </div>
  )
}
