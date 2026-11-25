import type { ReactNode } from 'react'
import { audio } from '../game/audio'

export function Plate({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`plate ${compact ? 'plate--compact' : ''}`} aria-label="Registration AY11 ALG">
      <span className="plate-gb">GB</span>
      <span className="plate-text">AY11 ALG</span>
    </div>
  )
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      className={`toggle ${value ? 'is-on' : ''}`}
      onClick={() => {
        audio.play('click')
        onChange(!value)
      }}
      type="button"
    >
      <span>
        <strong>{label}</strong>
        {hint && <em>{hint}</em>}
      </span>
      <span className="toggle-track"><span className="toggle-knob" /></span>
    </button>
  )
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <label className="slider-row">
      <span className="slider-label">
        <strong>{label}</strong>
        <em>{format ? format(value) : Math.round(((value - min) / (max - min)) * 100) + '%'}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => audio.play('click')}
      />
    </label>
  )
}

export function Panel({ title, subtitle, actions, children, wide }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`panel ${wide ? 'panel--wide' : ''}`}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={`stat ${accent ? 'stat--accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function BackButton({ onClick, label = 'BACK' }: { onClick: () => void; label?: string }) {
  return (
    <button
      className="btn btn--ghost"
      onClick={() => {
        audio.play('click')
        onClick()
      }}
    >
      ← {label}
    </button>
  )
}

export function ProgressDots({ total, done }: { total: number; done: number }) {
  return (
    <span className="dots" aria-label={`${done} of ${total} completed`}>
      {Array.from({ length: total }).map((_, i) => (
        <i key={i} className={i < done ? 'is-done' : ''} />
      ))}
    </span>
  )
}
