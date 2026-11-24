import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { GarageScene } from '../three/GarageScene'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { Plate } from './bits'

const LINES = [
  { big: '25 YEARS IN THE MAKING.', small: 'The garage was unlocked. The keys were on the seat.' },
  { big: 'ONE DRIVER.', small: 'Nonchalant. Funny. Expensive taste in cars.' },
  { big: 'ONE LEGENDARY JOURNEY.', small: 'Engine warm. Headlights on. Somebody has to drive.' },
  { big: '25 STOPS ALONG THE WAY.', small: 'Petrol, food, sweets and a very serious birthday.' },
  { big: 'HAPPY 25TH BIRTHDAY, AYMENE.', small: 'Let us take the long way round.' },
]

export function IntroScreen() {
  const settings = useGame((s) => s.settings)
  const startLevel = useGame((s) => s.startLevel)
  const setScreen = useGame((s) => s.setScreen)
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    audio.init()
    audio.startMusic('finale')
    audio.play('door')
  }, [])

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 2600),
      window.setTimeout(() => setStep(2), 5200),
      window.setTimeout(() => setStep(3), 7600),
      window.setTimeout(() => setStep(4), 9800),
      window.setTimeout(() => finish(), 14000),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = () => {
    if (leaving) return
    setLeaving(true)
    audio.play('engineStart')
    window.setTimeout(() => startLevel(1), 260)
  }

  const line = LINES[Math.min(step, LINES.length - 1)]

  return (
    <div className={`intro-root ${leaving ? 'is-leaving' : ''}`}>
      <Canvas
        dpr={[1, settings.graphics === 'low' ? 1 : 1.8]}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ fov: 40, position: [7, 3, 9] }}
      >
        <GarageScene mode="intro" phase={step >= 1 ? 2 : 0} lowGraphics={settings.graphics === 'low'} />
      </Canvas>
      <div className="intro-vignette" aria-hidden />
      <div className="intro-content">
        <div className="intro-badge">
          <span>AY MENE 25</span>
          <span className="micro-label">THE ULTIMATE ROAD TRIP</span>
        </div>
        <div className="intro-lines" key={step}>
          <h1>{line.big}</h1>
          <p>{line.small}</p>
        </div>
        <div className="intro-foot">
          <Plate />
          <div className="intro-progress">
            {LINES.map((_, i) => (
              <i key={i} className={i <= step ? 'is-on' : ''} />
            ))}
          </div>
          <button className="btn btn--ghost" onClick={finish} disabled={leaving}>
            SKIP INTRO →
          </button>
        </div>
      </div>
      <button className="intro-skip" onClick={() => { audio.play('click'); setScreen('menu') }} aria-label="Back to menu">
        ✕
      </button>
    </div>
  )
}
