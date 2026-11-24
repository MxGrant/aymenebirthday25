import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { GarageScene } from '../three/GarageScene'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { LEVELS, getLevel } from '../content/levels'
import { Plate, Stat, BackButton } from './bits'
import { LevelSelect } from './LevelSelect'
import { SettingsPanel } from './SettingsPanel'
import { HowToPlay } from './HowToPlay'
import type { Screen } from '../game/types'

export function MenuShell() {
  const screen = useGame((s) => s.screen)
  const progress = useGame((s) => s.progress)
  const settings = useGame((s) => s.settings)
  const setScreen = useGame((s) => s.setScreen)
  const levelId = useGame((s) => s.levelId)
  const updateSettings = useGame((s) => s.updateSettings)
  const startLevel = useGame((s) => s.startLevel)
  const openStationPreview = useGame((s) => s.openStationPreview)

  const lastLevel = useMemo(() => {
    const candidate = progress.lastLevel
    return Math.min(candidate, progress.unlockedLevel)
  }, [progress])

  useEffect(() => {
    audio.setVolume('master', settings.master)
    audio.setVolume('music', settings.music)
    audio.setVolume('sfx', settings.sfx)
    audio.setVolume('engine', settings.engine)
    audio.setMuted(settings.muted)
    audio.startMusic('menu')
  }, [settings])

  const go = (next: Screen) => {
    audio.play('click')
    setScreen(next)
  }

  const begin = () => {
    audio.init()
    audio.play('confirm')
    setScreen('intro')
  }

  const continueJourney = () => {
    audio.init()
    audio.play('confirm')
    startLevel(lastLevel)
  }

  const inPanel = screen !== 'menu'

  return (
    <div className="menu-root">
      <div className="menu-canvas">
        <Canvas
          shadows
          dpr={[1, settings.graphics === 'low' ? 1 : 1.85]}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
          camera={{ fov: 38, position: [7, 3, 9] }}
        >
          <GarageScene mode={screen === 'garage' ? 'inspect' : 'menu'} lowGraphics={settings.graphics === 'low'} />
        </Canvas>
      </div>
      <div className="menu-vignette" aria-hidden />
      <div className="menu-grain" aria-hidden />

      <header className="menu-top">
        <div className="wordmark">
          <span className="wordmark-a">AY</span>
          <span className="wordmark-b">MENE</span>
          <span className="wordmark-25">25</span>
        </div>
        <div className="menu-top-right">
          <span className="micro-label">25 YEARS · 25 STOPS · ONE LEGEND</span>
          <button
            className="icon-btn"
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            onClick={() => {
              audio.init()
              updateSettings({ muted: !settings.muted })
              audio.setMuted(!settings.muted)
              if (settings.muted) audio.play('click')
            }}
          >
            {settings.muted ? '◼ SOUND OFF' : '◉ SOUND ON'}
          </button>
        </div>
      </header>

      {!inPanel && (
        <div className="menu-main">
          <div className="menu-left">
            <h1 className="display">
              THE ULTIMATE
              <br />
              <span>ROAD TRIP</span>
            </h1>
            <p className="menu-sub">
              A garage full of promise, twenty-five stops, and one driver who claims he is not competitive.
            </p>
            <nav className="menu-nav">
              <button className="menu-item menu-item--primary" onClick={begin}>
                <span className="menu-num">01</span>
                <span className="menu-label">
                  START YOUR JOURNEY
                  <em>Cinematic intro · Level 01</em>
                </span>
                <span className="menu-arrow">→</span>
              </button>
              <button className="menu-item" onClick={continueJourney} disabled={!progress.journeyStarted}>
                <span className="menu-num">02</span>
                <span className="menu-label">
                  CONTINUE JOURNEY
                  <em>{progress.journeyStarted ? `Resume at Stop ${String(lastLevel).padStart(2, '0')}` : 'No journey saved yet'}</em>
                </span>
                <span className="menu-arrow">→</span>
              </button>
              <button className="menu-item" onClick={() => go('levelselect')}>
                <span className="menu-num">03</span>
                <span className="menu-label">
                  SELECT LEVEL
                  <em>{progress.completedLevels.length} of 25 stops completed</em>
                </span>
                <span className="menu-arrow">→</span>
              </button>
              <button className="menu-item" onClick={() => go('garage')}>
                <span className="menu-num">04</span>
                <span className="menu-label">
                  GARAGE
                  <em>Inspect the car · AY11 ALG</em>
                </span>
                <span className="menu-arrow">→</span>
              </button>
              <button className="menu-item" onClick={() => go('howto')}>
                <span className="menu-num">05</span>
                <span className="menu-label">
                  HOW TO PLAY
                  <em>Controls, objectives, petrol stations</em>
                </span>
                <span className="menu-arrow">→</span>
              </button>
              <button className="menu-item" onClick={() => go('settings')}>
                <span className="menu-num">06</span>
                <span className="menu-label">
                  SETTINGS
                  <em>Audio · graphics · controls</em>
                </span>
                <span className="menu-arrow">→</span>
              </button>
            </nav>
          </div>

          <aside className="menu-right">
            <div className="car-card">
              <span className="micro-label">THE CAR</span>
              <h3>THE BLACK SUPER</h3>
              <p>Gloss black · V8 · carbon aero · 0–100 in a rumour</p>
              <Plate />
            </div>
            <div className="progress-card">
              <Stat label="STOPS COMPLETED" value={`${progress.completedLevels.length}/25`} accent />
              <Stat label="COLLECTIBLES" value={Object.values(progress.collectibles).reduce((n, a) => n + a.length, 0)} />
              <Stat label="MEMORIES FOUND" value={Object.values(progress.discovered).reduce((n, a) => n + a.length, 0)} />
              <Stat label="ACHIEVEMENTS" value={`${progress.achievements.length}/7`} />
              <div className="route-strip">
                {LEVELS.map((l) => (
                  <i
                    key={l.id}
                    className={progress.completedLevels.includes(l.id) ? 'done' : l.id <= progress.unlockedLevel ? 'open' : ''}
                    title={`${l.id}. ${l.name}`}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {screen === 'garage' && (
        <div className="overlay overlay--garage">
          <div className="overlay-inner">
            <div className="garage-head">
              <BackButton onClick={() => go('menu')} label="MAIN MENU" />
              <span className="micro-label">VEHICLE INSPECTION</span>
            </div>
            <div className="garage-spec">
              <div className="garage-spec-left">
                <h2>AYMENE’S SUPERCAR</h2>
                <p>Gloss black. Carbon aero. Registration permanently set — this one is not a rental.</p>
                <Plate />
              </div>
              <div className="garage-spec-grid">
                <Stat label="REGISTRATION" value="AY11 ALG" accent />
                <Stat label="DRIVETRAIN" value="AWD" />
                <Stat label="0 – 100 KM/H" value="3.1s" />
                <Stat label="TOP SPEED" value="325 km/h" />
                <Stat label="NITRO" value="Fitted" />
                <Stat label="SNACK CAPACITY" value="Unlimited" accent />
              </div>
            </div>
            <p className="garage-note">Drag to rotate · scroll to zoom · the car can be inspected between every stop.</p>
          </div>
        </div>
      )}

      {screen === 'levelselect' && (
        <div className="overlay">
          <div className="overlay-inner overlay-inner--wide">
            <div className="garage-head">
              <BackButton onClick={() => go('menu')} label="MAIN MENU" />
              <span className="micro-label">THE ROUTE · 25 STOPS</span>
            </div>
            <LevelSelect
              onPlay={(id) => { audio.play('confirm'); startLevel(id) }}
              onPreview={(id) => { audio.play('click'); openStationPreview(id) }}
            />
          </div>
        </div>
      )}

      {screen === 'howto' && (
        <div className="overlay">
          <div className="overlay-inner overlay-inner--wide">
            <div className="garage-head">
              <BackButton onClick={() => go('menu')} label="MAIN MENU" />
              <span className="micro-label">DRIVER BRIEFING</span>
            </div>
            <HowToPlay />
          </div>
        </div>
      )}

      {screen === 'settings' && (
        <div className="overlay">
          <div className="overlay-inner">
            <div className="garage-head">
              <BackButton onClick={() => go('menu')} label="MAIN MENU" />
              <span className="micro-label">SETTINGS</span>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}

      <footer className="menu-foot">
        <span>STOP {String(levelId).padStart(2, '0')} · {getLevel(levelId).location.toUpperCase()}</span>
        <span className="menu-foot-mid">WASD / ARROWS TO DRIVE · SHIFT NITRO · E INTERACT · ESC PAUSE</span>
        <span>AY11 ALG</span>
      </footer>
    </div>
  )
}
