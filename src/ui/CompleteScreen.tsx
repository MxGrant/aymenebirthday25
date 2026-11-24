import { useMemo } from 'react'
import { useGame } from '../game/store'
import { getLevel } from '../content/levels'
import { audio } from '../game/audio'
import { formatTime } from '../game/progress'
import { Plate } from './bits'

export function CompleteScreen() {
  const result = useGame((s) => s.result)
  const startLevel = useGame((s) => s.startLevel)
  const setScreen = useGame((s) => s.setScreen)
  const progress = useGame((s) => s.progress)
  const planFirstStop = () => {
    audio.play('click')
    setScreen('levelselect')
  }

  const level = useMemo(() => getLevel(result?.levelId ?? 1), [result])
  const nextLevel = useMemo(() => (level.id < 25 ? getLevel(level.id + 1) : null), [level])
  const totalCollected = Object.values(progress.collectibles).reduce((n, a) => n + a.length, 0)

  if (!result) {
    return (
      <div className="complete-root">
        <div className="complete-card">
          <h1>NO RESULT YET</h1>
          <button className="btn btn--primary" onClick={() => setScreen('menu')}>MAIN MENU</button>
        </div>
      </div>
    )
  }

  return (
    <div className="complete-root">
      <div className="complete-glow" aria-hidden />
      <section className="complete-card">
        <span className="micro-label">STOP {String(level.id).padStart(2, '0')} COMPLETE · {level.section.toUpperCase()}</span>
        <h1>{level.name}</h1>
        <p className="complete-station">{level.station.name} — {level.station.tagline}</p>

        <div className="complete-stats">
          <div>
            <span>TIME</span>
            <strong>{formatTime(result.time)}</strong>
            <em>BEST {formatTime(result.bestTime ?? result.time)}</em>
          </div>
          <div>
            <span>COLLECTIBLES</span>
            <strong>{result.collected}/{result.totalCollectibles}</strong>
            <em>{result.collected === result.totalCollectibles ? 'FULL HOUSE' : 'ROOM TO IMPROVE'}</em>
          </div>
          <div>
            <span>BUMPS</span>
            <strong>{result.collisions}</strong>
            <em>{result.collisions === 0 ? 'CLEAN DRIVING' : 'THE PAINT FORGIVES'}</em>
          </div>
          <div>
            <span>JOURNEY</span>
            <strong>{progress.completedLevels.length}/25</strong>
            <em>{totalCollected} ITEMS COLLECTED</em>
          </div>
        </div>

        {result.newAchievements.length > 0 && (
          <div className="complete-achievements">
            <span className="micro-label">ACHIEVEMENTS UNLOCKED</span>
            {result.newAchievements.map((a) => (
              <div key={a.id} className="achievement-pill">
                <span>{a.icon}</span>
                <div>
                  <strong>{a.name}</strong>
                  <em>{a.description}</em>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextLevel ? (
          <div className="next-stop">
            <div>
              <span className="micro-label">NEXT STOP {String(nextLevel.id).padStart(2, '0')}</span>
              <h3>{nextLevel.name}</h3>
              <p>{nextLevel.tagline}</p>
            </div>
            <div className="next-stop-meta">
              <span>{nextLevel.location}</span>
              <span>{nextLevel.objective.type.toUpperCase()} · {nextLevel.collectibles.count} COLLECTIBLES</span>
            </div>
          </div>
        ) : (
          <div className="next-stop next-stop--finale">
            <div>
              <span className="micro-label">ROUTE COMPLETE</span>
              <h3>THE ULTIMATE DESTINATION</h3>
              <p>25 years. 25 stops. One legend. The lights are on.</p>
            </div>
            <Plate compact />
          </div>
        )}

        <div className="complete-actions">
          {nextLevel ? (
            <button
              className="btn btn--primary btn--big"
              onClick={() => {
                audio.play('confirm')
                startLevel(nextLevel.id)
              }}
            >
              DRIVE TO STOP {String(nextLevel.id).padStart(2, '0')} →
            </button>
          ) : (
            <button
              className="btn btn--primary btn--big"
              onClick={() => {
                audio.play('confirm')
                setScreen('finale')
              }}
            >
              ENTER THE FINALE →
            </button>
          )}
          <button className="btn" onClick={() => { audio.play('click'); startLevel(level.id) }}>REPLAY THIS STOP</button>
          <button className="btn" onClick={planFirstStop}>ROUTE MAP</button>
          <button className="btn btn--ghost" onClick={() => { audio.play('click'); setScreen('garage') }}>GARAGE</button>
        </div>

        {result.unlockedNext && nextLevel && (
          <p className="complete-note">Stop {String(nextLevel.id).padStart(2, '0')} unlocked. Progress saved automatically.</p>
        )}
      </section>
    </div>
  )
}
