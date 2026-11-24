import { useEffect, useMemo, useState } from 'react'
import { getLevel } from '../content/levels'
import { getScrapbook, mediaPath, SCRAPBOOK_OBJECTS, type ScrapbookObjectKey } from '../content/scrapbooks'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { Glyph, Plate } from './bits'
import type { MediaSlot } from '../game/types'

const STATION_ACCENTS: Record<string, string> = {
  premium: '#d5c5a1',
  neon: '#59e3ff',
  classic: '#c0392b',
  country: '#8fae6a',
  coastal: '#59c7c7',
  racing: '#e63946',
}

function MediaFrame({ slot, file, stop, ratio = '4 / 3' }: { slot?: MediaSlot; file: string; stop: number; ratio?: string }) {
  const [failed, setFailed] = useState(false)
  const src = slot?.src
  if (src && !failed) {
    return (
      <img
        className="scrap-photo"
        src={src}
        alt={slot?.caption ?? 'Scrapbook photograph'}
        style={{ aspectRatio: ratio }}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="media-missing" style={{ aspectRatio: ratio }}>
      <span className="media-missing-icon">▤</span>
      <strong>PHOTOGRAPH SLOT</strong>
      <p>{slot?.caption ?? 'Add a photograph to make this stop personal.'}</p>
      <code>{mediaPath(stop, file)}</code>
    </div>
  )
}

function PhotoWall({ stop, photos, onOpen }: { stop: number; photos: MediaSlot[]; onOpen: (slot: MediaSlot) => void }) {
  return (
    <div className="photo-wall">
      {photos.map((photo, i) => (
        <button key={i} className={`polaroid polaroid--${i % 3}`} onClick={() => onOpen(photo)}>
          <span className="polaroid-tape" />
          <MediaFrame slot={photo} file={`photo-${i + 1}.jpg`} stop={stop} />
          <span className="polaroid-caption">{photo.caption}</span>
        </button>
      ))}
      <p className="scrap-note">
        Photographs can be swapped at any time — drop files into <code>public/media/stop-{String(stop).padStart(2, '0')}/</code>.
      </p>
    </div>
  )
}

function VideoPanel({ stop, slot }: { stop: number; slot: MediaSlot }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [slot.src])
  return (
    <div className="video-panel">
      {slot.src && !failed ? (
        <video
          key={slot.src}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          src={slot.src}
          className="scrap-video"
        />
      ) : (
        <div className="media-missing media-missing--video">
          <span className="media-missing-icon">▶</span>
          <strong>VIDEO NOT SUPPLIED YET</strong>
          <p>{slot.caption}</p>
          <code>{mediaPath(stop, 'video.mp4')}</code>
        </div>
      )}
      <p className="video-caption">{slot.caption}</p>
      <p className="scrap-note">MP4 supported. Drop the file in the stop’s media folder and it plays here automatically.</p>
    </div>
  )
}

function ListPanel({
  title,
  items,
  glyph,
  tone,
}: {
  title: string
  items: { name: string; note: string }[]
  glyph: string
  tone: string
}) {
  return (
    <div className="list-panel">
      <h4>
        <span style={{ color: tone }}>{glyph}</span> {title}
      </h4>
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <strong>{item.name}</strong>
            <em>{item.note}</em>
          </li>
        ))}
      </ul>
      <p className="scrap-note">Editable placeholder list — swap these for the real favourites any time.</p>
    </div>
  )
}

export function StationScreen() {
  const levelId = useGame((s) => s.stationLevel)
  const progress = useGame((s) => s.progress)
  const settings = useGame((s) => s.settings)
  const pendingStats = useGame((s) => s.pendingStats)
  const preview = useGame((s) => s.previewStation)
  const recordItem = useGame((s) => s.recordItem)
  const finishLevel = useGame((s) => s.finishLevel)
  const setScreen = useGame((s) => s.setScreen)
  const setFinaleSeen = useGame((s) => s.setFinaleSeen)
  const level = useMemo(() => getLevel(levelId), [levelId])
  const book = useMemo(() => getScrapbook(levelId), [levelId])
  const [openKey, setOpenKey] = useState<ScrapbookObjectKey | null>(null)
  const [lightbox, setLightbox] = useState<MediaSlot | null>(null)
  const discovered = progress.discovered[levelId] ?? []
  const accent = STATION_ACCENTS[level.station.style] ?? '#d5c5a1'
  const objects = useMemo(() => {
    const shift = (levelId * 3) % SCRAPBOOK_OBJECTS.length
    return [...SCRAPBOOK_OBJECTS.slice(shift), ...SCRAPBOOK_OBJECTS.slice(0, shift)]
  }, [levelId])

  useEffect(() => {
    audio.startMusic('station')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null)
        else if (openKey) setOpenKey(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openKey, lightbox])

  const open = (key: ScrapbookObjectKey) => {
    setOpenKey(key)
    recordItem(levelId, key)
    audio.play(key === 'secret' ? 'achievement' : 'click')
  }

  const finish = () => {
    if (preview) {
      setScreen('levelselect')
      return
    }
    const stats = pendingStats
    finishLevel({
      levelId,
      time: stats?.time ?? 0,
      collected: stats?.collected ?? [],
      totalCollectibles: stats?.totalCollectibles ?? level.collectibles.count,
      collisions: stats?.collisions ?? 0,
    })
    audio.play('confirm')
    if (levelId === 25) {
      setFinaleSeen()
      setScreen('finale')
    }
  }

  const hintCount = discovered.length

  return (
    <div className="station-root" style={{ '--station-accent': accent } as React.CSSProperties}>
      <div className="station-room" aria-hidden>
        <div className="station-ceiling">
          {[0, 1, 2, 3].map((i) => <span key={i} />)}
        </div>
        <div className="station-backwall" />
        <div className="station-shelf station-shelf--left" />
        <div className="station-shelf station-shelf--right" />
        <div className="station-fridge" />
        <div className="station-floor" />
        <div className="station-glow" />
      </div>

      <header className="station-head">
        <div>
          <span className="micro-label">STOP {String(level.id).padStart(2, '0')} · {level.location.toUpperCase()}</span>
          <h1>{book.title}</h1>
          <p>{book.subtitle}</p>
        </div>
        <div className="station-head-right">
          <div className="station-progress">
            <span>{hintCount}/8 MEMORIES FOUND</span>
            <div className="station-progress-bar"><i style={{ width: `${(hintCount / 8) * 100}%` }} /></div>
          </div>
          <Plate compact />
        </div>
      </header>

      <div className="station-intro">
        <p>{book.intro}</p>
      </div>

      <div className="shop-grid">
        {objects.map((obj) => {
          const found = discovered.includes(obj.key)
          return (
            <button
              key={obj.key}
              className={`shop-object shop-object--${obj.key} ${found ? 'is-found' : ''}`}
              onClick={() => open(obj.key)}
            >
              <span className="shop-object-icon"><Glyph kind={obj.key} /></span>
              <span className="shop-object-text">
                <strong>{obj.label}</strong>
                <em>{obj.hint}</em>
              </span>
              <span className="shop-object-state">{found ? 'OPENED' : 'INTERACT'}</span>
            </button>
          )
        })}
      </div>

      <footer className="station-foot">
        <div className="station-foot-left">
          <span className="micro-label">SCRAPBOOK · STOP {String(level.id).padStart(2, '0')}</span>
          <p>
            {settings.subtitles
              ? 'Everything here is interactive. The drawer is the interesting one.'
              : 'Interact with every object.'}
          </p>
        </div>
        <div className="station-foot-actions">
          <button className="btn btn--ghost" onClick={() => { audio.play('click'); setScreen(preview ? 'levelselect' : 'menu') }}>
            {preview ? 'BACK TO ROUTE' : 'MAIN MENU'}
          </button>
          <button className="btn btn--primary" onClick={finish}>
            {preview ? 'PREVIEW COMPLETE →' : levelId === 25 ? 'ENTER THE CELEBRATION →' : 'FINISH THIS STOP →'}
          </button>
        </div>
      </footer>

      {openKey && (
        <div className="modal-backdrop" onClick={() => setOpenKey(null)}>
          <div className="modal scrapbook-modal" onClick={(e) => e.stopPropagation()}>
            <header className="scrapbook-head">
              <div>
                <span className="micro-label">{SCRAPBOOK_OBJECTS.find((o) => o.key === openKey)?.label}</span>
                <h2>{book.title}</h2>
              </div>
              <button className="icon-btn" onClick={() => { audio.play('click'); setOpenKey(null) }}>✕ CLOSE</button>
            </header>

            <div className="scrapbook-body">
              {openKey === 'photos' && (
                <PhotoWall stop={level.id} photos={book.photos} onOpen={(slot) => setLightbox(slot)} />
              )}

              {openKey === 'video' && <VideoPanel stop={level.id} slot={book.video} />}

              {openKey === 'counter' && (
                <article className="paper">
                  <h3>From the counter</h3>
                  {book.counter.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <div className="paper-sign">
                    <span>— The Birthday Committee</span>
                    <Plate compact />
                  </div>
                </article>
              )}

              {openKey === 'drinks' && <ListPanel title="THE FRIDGE" items={book.drinks} glyph="◇" tone="#7fd9ff" />}
              {openKey === 'sweets' && <ListPanel title="THE SWEET SHELF" items={book.sweets} glyph="✦" tone="#ffb3d9" />}
              {openKey === 'food' && <ListPanel title="THE HOT COUNTER" items={book.food} glyph="◍" tone="#ffc98a" />}

              {openKey === 'guestbook' && (
                <div className="guestbook">
                  {book.guestbook.map((entry, i) => (
                    <article key={i} className={`guest-note guest-note--${i % 3}`}>
                      <p>“{entry.message}”</p>
                      <span>— {entry.from}</span>
                    </article>
                  ))}
                  <p className="scrap-note">Messages are editable placeholders — replace them with the real ones.</p>
                </div>
              )}

              {openKey === 'secret' && (
                <div className="secret-drawer">
                  <span className="secret-icon">✜</span>
                  <h3>THE HIDDEN DRAWER</h3>
                  <p>{book.secret}</p>
                  <span className="micro-label">EASTER EGG FOUND · MEMORY SAVED</span>
                </div>
              )}

              {book.audio?.src && openKey === 'counter' && (
                <audio controls src={book.audio.src} className="scrap-audio" />
              )}
            </div>

            <footer className="scrapbook-foot">
              <span>{discovered.length}/8 objects opened at this stop</span>
              <button className="btn" onClick={() => { audio.play('click'); setOpenKey(null) }}>BACK TO THE STATION</button>
            </footer>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="modal-backdrop lightbox" onClick={() => setLightbox(null)}>
          <figure className="lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <MediaFrame slot={lightbox} file="photo-1.jpg" stop={level.id} ratio="16 / 10" />
            <figcaption>{lightbox.caption}</figcaption>
            <button className="btn btn--ghost" onClick={() => setLightbox(null)}>CLOSE (ESC)</button>
          </figure>
        </div>
      )}
    </div>
  )
}
