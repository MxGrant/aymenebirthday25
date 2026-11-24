/**
 * Central type definitions for AY MENE 25: THE ULTIMATE ROAD TRIP.
 * Every level is data-driven — the engine reads LevelSpec records and builds
 * the world procedurally, so new stops can be added without touching the engine.
 */

export type Section = 'london' | 'countryside' | 'final'

export type Surface =
  | 'garage'
  | 'city'
  | 'riverside'
  | 'tunnel'
  | 'food'
  | 'sweet'
  | 'westend'
  | 'motorway'
  | 'country'
  | 'village'
  | 'hills'
  | 'lake'
  | 'mountain'
  | 'forest'
  | 'coast'
  | 'circuit'
  | 'station'

export type TimeOfDay = 'day' | 'golden' | 'sunset' | 'night'
export type Weather = 'clear' | 'rain' | 'fog'

export type CollectibleKind = 'fuel' | 'sweet' | 'food' | 'star' | 'badge' | 'token'

export type ObjectiveType = 'route' | 'checkpoints' | 'timed' | 'collect' | 'clean' | 'precision'

export interface Objective {
  type: ObjectiveType
  /** Short line shown in the HUD, e.g. "Reach the station before sunset." */
  label: string
  /** Objective hint shown in the intro card. */
  detail: string
  /** Seconds — only for 'timed'. */
  timeLimit?: number
  /** How many collectibles are required — only for 'collect'. */
  collectCount?: number
  /** Allowed bumps — only for 'clean'. */
  maxCollisions?: number
  /** How many checkpoint gates must be passed — only for 'checkpoints'. */
  gateCount?: number
}

export type StationStyle = 'premium' | 'classic' | 'neon' | 'coastal' | 'racing' | 'country'

export interface LevelSpec {
  id: number
  name: string
  section: Section
  tagline: string
  location: string
  surface: Surface
  timeOfDay: TimeOfDay
  weather: Weather
  /** Total road width in metres. */
  roadWidth: number
  /** Centreline length in metres. */
  length: number
  /** 0 = straight motorway, 1 = mountain switchbacks. */
  curviness: number
  /** Vertical amplitude in metres. */
  hills: number
  /** Number of ambient cars. */
  traffic: number
  collectibles: { kind: CollectibleKind; count: number }
  objective: Objective
  station: { name: string; style: StationStyle; tagline: string }
  /** Text shown when the level unlocks. */
  unlockText: string
}

export interface MediaSlot {
  /** Public path, e.g. "/media/stop-01/photo-1.jpg". */
  src?: string
  caption: string
}

export interface Scrapbook {
  stop: number
  title: string
  subtitle: string
  intro: string
  photos: MediaSlot[]
  video: MediaSlot
  audio?: MediaSlot
  counter: string[]
  drinks: { name: string; note: string }[]
  sweets: { name: string; note: string }[]
  food: { name: string; note: string }[]
  guestbook: { from: string; message: string }[]
  secret: string
}

export type GraphicsQuality = 'low' | 'medium' | 'high'

export interface Settings {
  master: number
  music: number
  sfx: number
  engine: number
  muted: boolean
  sensitivity: number
  graphics: GraphicsQuality
  reducedMotion: boolean
  subtitles: boolean
  cameraDistance: number
  invertSteer: boolean
}

export interface Progress {
  unlockedLevel: number
  completedLevels: number[]
  collectibles: Record<number, string[]>
  discovered: Record<number, string[]>
  achievements: string[]
  bestTimes: Record<number, number>
  lastLevel: number
  journeyStarted: boolean
  finaleSeen: boolean
}

export type Screen =
  | 'boot'
  | 'menu'
  | 'garage'
  | 'levelselect'
  | 'howto'
  | 'settings'
  | 'intro'
  | 'drive'
  | 'station'
  | 'complete'
  | 'finale'
  | 'credits'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
}
