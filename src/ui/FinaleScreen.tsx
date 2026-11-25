import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { FinaleScene } from '../three/FinaleScene'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { getScrapbook, mediaPath } from '../content/scrapbooks'
import { ACHIEVEMENTS } from '../game/progress'
import { getLevel } from '../content/levels'
import { Plate } from './bits'

const BEATS = [
  { at: 0, title: 'THE ULTIMATE DESTINATION', sub: 'The road opens up. The music builds. The car slows down.' },
  { at: 3600, title: '25 YEARS.', sub: 'A quarter of a century of excellent taste and questionable punctuality.' },
  { at: 6600, title: '25 STOPS.', sub: 'Every fuel receipt, every snack, every bend. All of it for you.' },
  { at: 9600, title: 'ONE LEGEND.', sub: 'Every great journey deserves a legendary driver.' },
  { at: 12600, title: 'HAPPY 25TH BIRTHDAY, AYMENE.', sub: 'The journey does not end here.' },
]

function FinalMedia({ stop }: { stop: number }) {
  const book = getScrapbook(stop)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [book.video.src])
  return (
    <div className="final-media">
      <div className="final-video-wrap">
        {book.video.src && !failed ? (
          <video className="scrap-video" controls playsInline preload="metadata" src={book.video.src} onError={() => setFailed(true)} />
        ) : (
          <div className="media-missing media-missing--video">
            <span className="media-missing-icon">▶</span>
            <strong>THE FINAL VIDEO</strong>
            <p>Drop the birthday video here and it plays automatically.</p>
            <code>{mediaPath(stop, 'video.mp4')}</code>
          </div>
        )}
      </div>
      <div className="final-montage">
        {book.photos.map((photo, i) => (
          <figure key={i} className="montage-slot">
            {photo.src ? (
              <img src={photo.src} alt={photo.caption} />
            ) : (
              <div className="montage-empty">
                <span>▤</span>
                <code>{mediaPath(stop, `photo-${i + 1}.jpg`)}</code>
              </div>
            )}
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

export function FinaleScreen() {
  const settings = useGame((s) => s.settings)
  const setScreen = useGame((s) => s.setScreen)
  const startLevel = useGame((s) => s.startLevel)
  const progress = useGame((s) => s.progress)
  const [step, setStep] = useState(0)
  const [key, setKey] = useState(0)
  const level = useMemo(() => getLevel(25), [])
  const book = useMemo(() => getScrapbook(25), [])

  useEffect(() => {
    audio.startMusic('finale')
    const timers = BEATS.map((b, i) => window.setTimeout(() => setStep(i), b.at))
    const achievement = window.setTimeout(() => audio.play('achievement'), 1800)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.clearTimeout(achievement)
    }
  }, [key])

  const beat = BEATS[step]
  const done = step >= BEATS.length - 1

  return (
    <div className="finale-root">
      <div className="finale-canvas">
        <Canvas
          key={key}
          dpr={[1, settings.graphics === 'low' ? 1 : 1.7]}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
          camera={{ fov: 44, position: [8, 4, 10] }}
        >
          <FinaleScene lowGraphics={settings.graphics === 'low' || settings.reducedMotion} />
        </Canvas>
      </div>
      <div className="finale-vignette" aria-hidden />

      <div className="finale-overlay">
        <header className="finale-head">
          <span className="micro-label">STOP 25 · {level.location.toUpperCase()}</span>
          <div className="finale-brand">
            <span>AY</span>MENE <em>25</em>
          </div>
        </header>

        <div className={`finale-beat ${done ? 'is-done' : ''}`} key={step}>
          <h1>{beat.title}</h1>
          <p>{beat.sub}</p>
        </div>

        {done && (
          <div className="finale-body">
            <div className="finale-message">
              <p className="finale-words">{book.counter[0]}</p>
              <p>{book.counter[1]}</p>
              <div className="finale-sign">
                <Plate />
                <span>25 YEARS · 25 STOPS · ONE LEGEND</span>
              </div>
            </div>

            <FinalMedia stop={25} />

            <div className="finale-achievements">
              <span className="micro-label">JOURNEY SUMMARY</span>
              <div className="finale-stats">
                <div><span>STOPS COMPLETED</span><strong>{progress.completedLevels.length}/25</strong></div>
                <div><span>ACHIEVEMENTS</span><strong>{progress.achievements.length}/{ACHIEVEMENTS.length}</strong></div>
                <div><span>COLLECTIBLES</span><strong>{Object.values(progress.collectibles).reduce((n, a) => n + a.length, 0)}</strong></div>
              </div>
            </div>

            <div className="finale-actions">
              <button
                className="btn btn--primary btn--big"
                onClick={() => {
                  audio.play('confirm')
                  setScreen('levelselect')
                }}
              >
                EXPLORE THE ROUTE
              </button>
              <button
                className="btn"
                onClick={() => {
                  audio.play('click')
                  setStep(0)
                  setKey((k) => k + 1)
                }}
              >
                REPLAY THE FINALE
              </button>
              <button className="btn" onClick={() => { audio.play('click'); startLevel(25) }}>REPLAY THE LAST DRIVE</button>
              <button className="btn btn--ghost" onClick={() => { audio.play('click'); setScreen('menu') }}>MAIN MENU</button>
            </div>

            <p className="finale-end">THE JOURNEY DOESN’T END HERE. HAPPY BIRTHDAY, AYMENE.</p>
          </div>
        )}

        {!done && (
          <button className="btn btn--ghost finale-skip" onClick={() => setStep(BEATS.length - 1)}>
            SKIP TO THE MESSAGE →
          </button>
        )}
      </div>
    </div>
  )
}
