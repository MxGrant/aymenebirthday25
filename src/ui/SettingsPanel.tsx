import { useState } from 'react'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { Slider, Toggle, Stat } from './bits'
import { ACHIEVEMENTS } from '../game/progress'
import type { GraphicsQuality, Settings } from '../game/types'

const QUALITIES: GraphicsQuality[] = ['low', 'medium', 'high']

export function SettingsPanel() {
  const settings = useGame((s) => s.settings)
  const update = useGame((s) => s.updateSettings)
  const resetProgress = useGame((s) => s.resetProgress)
  const progress = useGame((s) => s.progress)
  const [confirmReset, setConfirmReset] = useState(false)

  const setVolume = (channel: 'master' | 'music' | 'sfx' | 'engine', value: number) => {
    const patch: Partial<Settings> = {}
    patch[channel] = value
    update(patch)
    audio.setVolume(channel, value)
  }

  return (
    <div className="settings">
      <div className="settings-grid">
        <section className="settings-block">
          <h3>AUDIO</h3>
          <Slider label="Master volume" value={settings.master} onChange={(v) => setVolume('master', v)} />
          <Slider label="Music" value={settings.music} onChange={(v) => setVolume('music', v)} />
          <Slider label="Sound effects" value={settings.sfx} onChange={(v) => setVolume('sfx', v)} />
          <Slider label="Engine" value={settings.engine} onChange={(v) => setVolume('engine', v)} />
          <Toggle
            label="Mute everything"
            hint="Silence the car, the music and the birthday committee."
            value={settings.muted}
            onChange={(v) => {
              update({ muted: v })
              audio.setMuted(v)
            }}
          />
          <Toggle label="Subtitles" hint="Cinematic lines and station text." value={settings.subtitles} onChange={(v) => update({ subtitles: v })} />
        </section>

        <section className="settings-block">
          <h3>GRAPHICS</h3>
          <div className="quality-row">
            {QUALITIES.map((q) => (
              <button
                key={q}
                className={`quality ${settings.graphics === q ? 'is-active' : ''}`}
                onClick={() => {
                  audio.play('click')
                  update({ graphics: q })
                }}
              >
                {q.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="settings-hint">
            LOW reduces pixel ratio and particle counts for older laptops. MEDIUM is a good balance. HIGH adds denser scenery and
            full-resolution reflections.
          </p>
          <Toggle
            label="Reduced motion"
            hint="Calmer camera and fewer animated flourishes."
            value={settings.reducedMotion}
            onChange={(v) => update({ reducedMotion: v })}
          />
        </section>

        <section className="settings-block">
          <h3>DRIVING</h3>
          <Slider
            label="Steering sensitivity"
            value={settings.sensitivity}
            min={0.5}
            max={1.6}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => update({ sensitivity: v })}
          />
          <Slider
            label="Camera distance"
            value={settings.cameraDistance}
            min={0.75}
            max={1.4}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => update({ cameraDistance: v })}
          />
          <Toggle label="Invert steering" hint="Left becomes right. Chaos becomes a choice." value={settings.invertSteer} onChange={(v) => update({ invertSteer: v })} />
        </section>

        <section className="settings-block">
          <h3>PROGRESS</h3>
          <div className="settings-stats">
            <Stat label="STOPS COMPLETED" value={`${progress.completedLevels.length}/25`} accent />
            <Stat label="ACHIEVEMENTS" value={`${progress.achievements.length}/${ACHIEVEMENTS.length}`} />
            <Stat label="JOURNEY STARTED" value={progress.journeyStarted ? 'YES' : 'NOT YET'} />
          </div>
          <p className="settings-hint">
            Progress saves automatically in this browser. No account, no cloud, no email address — just you, the car and the
            snacks.
          </p>
          {!confirmReset ? (
            <button className="btn btn--ghost btn--danger" onClick={() => setConfirmReset(true)}>
              RESET PROGRESS
            </button>
          ) : (
            <div className="confirm-row">
              <span>Delete all 25 stops and achievements?</span>
              <button className="btn btn--danger-solid" onClick={() => { resetProgress(); setConfirmReset(false) }}>
                YES, RESET
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                KEEP
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
