import { ACHIEVEMENTS } from '../game/progress'
import { useGame } from '../game/store'

const DESKTOP: [string, string][] = [
  ['W / ↑', 'Accelerate'],
  ['S / ↓', 'Brake & reverse'],
  ['A D / ← →', 'Steer'],
  ['SPACE', 'Handbrake / drift'],
  ['SHIFT', 'Nitro boost'],
  ['E', 'Interact / enter station'],
  ['ESC', 'Pause'],
  ['C', 'Cinematic camera'],
]

const MOBILE: [string, string][] = [
  ['◀ ▶', 'Steer (left thumb)'],
  ['▲', 'Accelerate'],
  ['▼', 'Brake / reverse'],
  ['DRIFT', 'Handbrake'],
  ['N₂O', 'Nitro boost'],
  ['E', 'Interact'],
]

export function HowToPlay() {
  const settings = useGame((s) => s.settings)
  return (
    <div className="howto">
      <div className="howto-grid">
        <section className="howto-block">
          <h3>THE IDEA</h3>
          <p>
            Drive to the petrol station at the end of each stop. Park inside the illuminated bay, get out, and look at the
            photo wall — every station holds its own photographs of the trip.
          </p>
          <p>
            Stops unlock in order. Finish one to open the next. You can replay any completed stop from LEVEL SELECT — best times
            are saved.
          </p>
        </section>

        <section className="howto-block">
          <h3>DRIVING</h3>
          <ul className="howto-list">
            <li>The needle is your friend. Brake before the bend, not during it.</li>
            <li>Handbrake plus steering equals drift. The tyres will complain. Let them.</li>
            <li>Nitro refills itself. Use it on straights, not on hairpins.</li>
            <li>Grass is slower and slippier. The countryside is decorative, not a shortcut.</li>
            <li>Traffic exists. It has no insurance details. Avoid it.</li>
          </ul>
        </section>

        <section className="howto-block">
          <h3>OBJECTIVES</h3>
          <ul className="howto-tags">
            <li><strong>ROUTE</strong> Reach the station.</li>
            <li><strong>CHECKPOINTS</strong> Pass every lit gate, then park.</li>
            <li><strong>TIMED</strong> Arrive before the clock runs out.</li>
            <li><strong>COLLECT</strong> Gather enough tokens before parking.</li>
            <li><strong>CLEAN</strong> Keep bumps under the limit.</li>
            <li><strong>PRECISION</strong> Park perfectly, with minimal contact.</li>
          </ul>
        </section>

        <section className="howto-block">
          <h3>CONTROLS · DESKTOP</h3>
          <table className="keys">
            <tbody>
              {DESKTOP.map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="settings-hint">Steering sensitivity, camera distance and audio are all adjustable in SETTINGS.</p>
        </section>

        <section className="howto-block">
          <h3>CONTROLS · MOBILE</h3>
          <table className="keys">
            <tbody>
              {MOBILE.map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="settings-hint">
            Touch controls appear automatically on small screens. {settings.subtitles ? 'Subtitles are currently on.' : 'Subtitles are currently off.'}
          </p>
        </section>

        <section className="howto-block">
          <h3>ACHIEVEMENTS</h3>
          <ul className="ach-list">
            {ACHIEVEMENTS.map((a) => (
              <li key={a.id}>
                <span className="ach-icon">{a.icon}</span>
                <span>
                  <strong>{a.name}</strong>
                  <em>{a.description}</em>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="howto-foot">
        <p>
          <strong>THE CAR.</strong> Black supercar. Registration <span className="mono">AY11 ALG</span>, front and rear,
          permanently. It has been engineered for this road trip and has opinions about your braking.
        </p>
      </div>
    </div>
  )
}
