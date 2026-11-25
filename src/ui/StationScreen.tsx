import { useEffect, useMemo, useState } from 'react'
import { getLevel } from '../content/levels'
import { getScrapbook, mediaPath } from '../content/scrapbooks'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import type { LevelSpec, MediaSlot } from '../game/types'

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

function PhotoWall({
  level,
  photos,
  onOpen,
}: {
  level: LevelSpec
  photos: MediaSlot[]
  onOpen: (slot: MediaSlot) => void
}) {
  return (
    <div className="photo-wall">
      {photos.map((photo, i) => (
        <button key={i} className={`polaroid polaroid--${i % 3}`} onClick={() => onOpen(photo)}>
          <span className="polaroid-tape" />
          <MediaFrame slot={photo} file={`photo-${i + 1}.jpg`} stop={level.id} />
          <span className="polaroid-caption">{photo.caption}</span>
        </button>
      ))}
    </div>
  )
}

export function StationScreen() {
  const levelId = useGame((s) => s.stationLevel)
  const pendingStats = useGame((s) => s.pendingStats)
  const preview = useGame((s) => s.previewStation)
  const finishLevel = useGame((s) => s.finishLevel)
  const setScreen = useGame((s) => s.setScreen)
  const setFinaleSeen = useGame((s) => s.setFinaleSeen)
  const level = useMemo(() => getLevel(levelId), [levelId])
  const book = useMemo(() => getScrapbook(levelId), [levelId])
  const [lightbox, setLightbox] = useState<MediaSlot | null>(null)

  useEffect(() => {
    audio.startMusic('station')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightbox) setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

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

  return (
    <div className="station-root station-root--photos">
      <div className="station-gallery">
        <PhotoWall level={level} photos={book.photos} onOpen={(slot) => setLightbox(slot)} />
      </div>

      <footer className="station-foot">
        <div className="station-foot-actions">
          <button className="btn btn--ghost" onClick={() => { audio.play('click'); setScreen(preview ? 'levelselect' : 'menu') }}>
            {preview ? 'BACK TO ROUTE' : 'MAIN MENU'}
          </button>
          <button className="btn btn--primary" onClick={finish}>
            {preview ? 'PREVIEW COMPLETE →' : levelId === 25 ? 'ENTER THE CELEBRATION →' : 'FINISH THIS STOP →'}
          </button>
        </div>
      </footer>

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
