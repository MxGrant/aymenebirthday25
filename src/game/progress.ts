import type { Achievement, Progress, Settings } from './types'

const PROGRESS_KEY = 'aymene25.progress.v2'
const SETTINGS_KEY = 'aymene25.settings.v2'

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.42,
  sfx: 0.72,
  engine: 0.5,
  muted: false,
  sensitivity: 1,
  graphics: 'high',
  reducedMotion: false,
  subtitles: true,
  cameraDistance: 1,
  invertSteer: false,
}

export const DEFAULT_PROGRESS: Progress = {
  unlockedLevel: 1,
  completedLevels: [],
  collectibles: {},
  achievements: [],
  bestTimes: {},
  lastLevel: 1,
  journeyStarted: false,
  finaleSeen: false,
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-drive', name: 'FIRST DRIVE', description: 'Complete Stop 01 — The Grand Departure.', icon: '◈' },
  { id: 'sweet-tooth', name: 'SWEET TOOTH', description: 'Collect every sweet in The Sweet Stop.', icon: '✦' },
  { id: 'petrolhead', name: 'PETROLHEAD', description: 'Conquer the racing circuit in No Looking Back.', icon: '⚙' },
  { id: 'halfway-legend', name: 'HALFWAY LEGEND', description: 'Reach Stop 15, the halfway pit stop.', icon: '◉' },
  { id: 'road-trip-champion', name: 'ROAD TRIP CHAMPION', description: 'Complete all 25 stops.', icon: '★' },
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<T>
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

export function loadProgress(): Progress {
  const loaded = readJson<Progress>(PROGRESS_KEY, DEFAULT_PROGRESS)
  return {
    ...DEFAULT_PROGRESS,
    ...loaded,
    completedLevels: Array.isArray(loaded.completedLevels) ? loaded.completedLevels.filter((n) => typeof n === 'number') : [],
    achievements: Array.isArray(loaded.achievements)
      ? loaded.achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))
      : [],
    collectibles: loaded.collectibles && typeof loaded.collectibles === 'object' ? loaded.collectibles : {},
    bestTimes: loaded.bestTimes && typeof loaded.bestTimes === 'object' ? loaded.bestTimes : {},
    unlockedLevel: Math.min(25, Math.max(1, Number(loaded.unlockedLevel) || 1)),
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* storage full or blocked — progress simply stays in memory */
  }
}

export function loadSettings(): Settings {
  const loaded = readJson<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  return {
    ...DEFAULT_SETTINGS,
    ...loaded,
    graphics: loaded.graphics === 'low' || loaded.graphics === 'medium' ? loaded.graphics : 'high',
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

export interface CompletionPayload {
  levelId: number
  time: number
  collected: string[]
  totalCollectibles: number
  collisions: number
  sweetLevel?: boolean
  circuitLevel?: boolean
}

export interface CompletionOutcome {
  progress: Progress
  newAchievements: Achievement[]
  unlockedNext: boolean
}

export function applyCompletion(progress: Progress, payload: CompletionPayload): CompletionOutcome {
  const p: Progress = {
    ...progress,
    completedLevels: [...progress.completedLevels],
    achievements: [...progress.achievements],
    collectibles: { ...progress.collectibles },
    bestTimes: { ...progress.bestTimes },
  }

  if (!p.completedLevels.includes(payload.levelId)) p.completedLevels.push(payload.levelId)
  p.completedLevels.sort((a, b) => a - b)

  const existing = p.collectibles[payload.levelId] ?? []
  p.collectibles[payload.levelId] = Array.from(new Set([...existing, ...payload.collected]))

  const best = p.bestTimes[payload.levelId]
  if (!best || payload.time < best) p.bestTimes[payload.levelId] = payload.time

  const next = Math.min(25, payload.levelId + 1)
  const unlockedNext = next > p.unlockedLevel
  p.unlockedLevel = Math.max(p.unlockedLevel, next)
  p.lastLevel = Math.min(25, payload.levelId + 1)

  const allDone = p.completedLevels.length >= 25
  const sweetDone = p.collectibles[8]?.length >= 6

  const unlocked = new Set(p.achievements)
  const newly: Achievement[] = []
  const grant = (id: string, condition: boolean) => {
    const ach = ACHIEVEMENTS.find((a) => a.id === id)
    if (ach && condition && !unlocked.has(id)) {
      unlocked.add(id)
      newly.push(ach)
    }
  }

  grant('first-drive', p.completedLevels.includes(1))
  grant('sweet-tooth', Boolean(sweetDone))
  grant('petrolhead', p.completedLevels.includes(23))
  grant('halfway-legend', p.completedLevels.includes(15))
  grant('road-trip-champion', allDone)

  p.achievements = Array.from(unlocked)
  if (allDone) p.finaleSeen = p.finaleSeen || payload.levelId === 25

  return { progress: p, newAchievements: newly, unlockedNext }
}

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
