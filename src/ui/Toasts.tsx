import { useGame } from '../game/store'

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismissToast)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast--${t.kind ?? 'info'}`} onClick={() => dismiss(t.id)}>
          <span className="toast-icon">{t.icon ?? '◈'}</span>
          <span className="toast-copy">
            <strong>{t.title}</strong>
            <em>{t.text}</em>
          </span>
        </button>
      ))}
    </div>
  )
}
