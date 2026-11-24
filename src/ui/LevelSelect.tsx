import { useMemo } from 'react'
import { LEVELS } from '../content/levels'
import { useGame } from '../game/store'
import { paletteFor, SECTION_META } from '../game/themes'
import { audio } from '../game/audio'
import type { LevelSpec, Section } from '../game/types'

const SECTIONS: Section[] = ['london', 'countryside', 'final']

function LevelCard({ level, onPlay, onPreview }: { level: LevelSpec; onPlay: (id: number) => void; onPreview: (id: number) => void }) {
  const progress = useGame((s) => s.progress)
  const locked = level.id > progress.unlockedLevel
  const done = progress.completedLevels.includes(level.id)
  const collected = progress.collectibles[level.id]?.length ?? 0
  const palette = useMemo(() => paletteFor(level), [level])

  const play = () => {
    if (locked) {
      audio.play('deny')
      return
    }
    audio.play('click')
    onPlay(level.id)
  }

  return (
    <div className={`level-card ${locked ? 'is-locked' : ''} ${done ? 'is-done' : ''}`}>
      <button className="level-main" onClick={play} aria-label={locked ? `${level.name} locked` : `Drive ${level.name}`}>
        <span
          className="level-thumb"
          style={{
            background: `linear-gradient(160deg, ${palette.skyTop} 0%, ${palette.skyBottom} 55%, ${palette.ground} 100%)`,
          }}
        >
          <span className="level-thumb-road" style={{ background: palette.road }} />
          <span className="level-thumb-glow" style={{ background: palette.accent }} />
          <span className="level-number">{String(level.id).padStart(2, '0')}</span>
          {done && <span className="level-tick">✓</span>}
          {locked && <span className="level-lock">◍</span>}
        </span>
        <span className="level-meta">
          <strong>{level.name}</strong>
          <em>{level.location}</em>
          <span className="level-tags">
            <i>{level.timeOfDay.toUpperCase()}</i>
            {level.weather !== 'clear' && <i>{level.weather.toUpperCase()}</i>}
            <i>{level.objective.type.toUpperCase()}</i>
          </span>
        </span>
      </button>
      <div className="level-foot">
        <span className="level-collect">
          <i className="dot" /> {collected}/{level.collectibles.count}
        </span>
        <span className="level-foot-right">
          {!locked && (
            <button
              className="level-mini"
              onClick={() => {
                audio.play('click')
                onPreview(level.id)
              }}
            >
              MEMORIES
            </button>
          )}
          <span className="level-station">{level.station.name.split('·')[0].trim()}</span>
        </span>
      </div>
      {locked && <span className="level-locked-note">Finish Stop {String(level.id - 1).padStart(2, '0')} to unlock</span>}
    </div>
  )
}

export function LevelSelect({ onPlay, onPreview }: { onPlay: (id: number) => void; onPreview: (id: number) => void }) {
  const progress = useGame((s) => s.progress)

  return (
    <div className="levelselect">
      <div className="levelselect-head">
        <div>
          <h2>THE ROUTE</h2>
          <p>London to the coast to the lights. Every stop unlocks the next — no shortcuts, no skipping dessert. MEMORIES opens any unlocked station scrapbook.</p>
        </div>
        <div className="levelselect-stats">
          <span><strong>{progress.completedLevels.length}</strong> / 25 STOPS</span>
          <span><strong>{progress.unlockedLevel}</strong> UNLOCKED</span>
        </div>
      </div>

      {SECTIONS.map((section) => {
        const levels = LEVELS.filter((l) => l.section === section)
        const meta = SECTION_META[section]
        const complete = levels.filter((l) => progress.completedLevels.includes(l.id)).length
        return (
          <section key={section} className="map-section">
            <header className="map-section-head">
              <span className="map-section-line" style={{ background: meta.accent }} />
              <div>
                <h3 style={{ color: meta.accent }}>{meta.title}</h3>
                <p>{meta.subtitle} · {complete}/{levels.length} complete</p>
              </div>
            </header>
            <div className="map-strip">
              <div className="map-strip-line" />
              <div className="map-cards">
                {levels.map((level) => (
                  <LevelCard key={level.id} level={level} onPlay={onPlay} onPreview={onPreview} />
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
