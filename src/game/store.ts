import { create } from 'zustand'
import {
  ACHIEVEMENTS,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  applyCompletion,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
  type CompletionPayload,
} from './progress'
import type { ParkStats } from './runtime'
import type { Achievement, Progress, Screen, Settings } from './types'

export interface LevelResult {
  levelId: number
  time: number
  collected: number
  totalCollectibles: number
  collisions: number
  objectiveMet: boolean
  bestTime?: number
  newAchievements: Achievement[]
  unlockedNext: boolean
}

export interface Toast {
  id: number
  title: string
  text: string
  icon?: string
  kind?: 'achievement' | 'info' | 'collect'
}

interface GameStore {
  screen: Screen
  levelId: number
  settings: Settings
  progress: Progress
  result: LevelResult | null
  toasts: Toast[]
  stationLevel: number
  pendingStats: ParkStats | null
  previewStation: boolean
  setPendingStats: (stats: ParkStats | null) => void
  openStationPreview: (id: number) => void
  showIntro: boolean
  setScreen: (screen: Screen) => void
  setLevel: (id: number) => void
  startLevel: (id: number) => void
  enterStation: (id: number) => void
  finishLevel: (payload: CompletionPayload) => LevelResult
  discoverAchievement: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetProgress: () => void
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  setFinaleSeen: () => void
}

const initialProgress = loadProgress()
const initialSettings = loadSettings()

let toastId = 0

export const useGame = create<GameStore>((set, get) => ({
  screen: 'menu',
  levelId: initialProgress.lastLevel > initialProgress.unlockedLevel ? initialProgress.unlockedLevel : initialProgress.lastLevel,
  settings: initialSettings,
  progress: initialProgress,
  result: null,
  toasts: [],
  stationLevel: 1,
  pendingStats: null,
  previewStation: false,
  showIntro: false,

  setPendingStats: (stats) => set({ pendingStats: stats }),

  openStationPreview: (id) => set({ stationLevel: id, previewStation: true, screen: 'station' }),

  setScreen: (screen) => set({ screen }),

  setLevel: (id) => set({ levelId: Math.max(1, Math.min(25, id)) }),

  startLevel: (id) => {
    const progress = get().progress
    const level = Math.max(1, Math.min(25, id))
    if (level > progress.unlockedLevel) return
    const updated: Progress = { ...progress, lastLevel: level, journeyStarted: true }
    saveProgress(updated)
    set({ progress: updated, levelId: level, screen: 'drive', result: null })
  },

  enterStation: (id) => set({ stationLevel: id, previewStation: false, screen: 'station' }),

  finishLevel: (payload) => {
    const { progress } = get()
    const outcome = applyCompletion(progress, payload)
    saveProgress(outcome.progress)
    const result: LevelResult = {
      levelId: payload.levelId,
      time: payload.time,
      collected: payload.collected.length,
      totalCollectibles: payload.totalCollectibles,
      collisions: payload.collisions,
      objectiveMet: true,
      bestTime: outcome.progress.bestTimes[payload.levelId],
      newAchievements: outcome.newAchievements,
      unlockedNext: outcome.unlockedNext,
    }
    set({ progress: outcome.progress, result, screen: 'complete' })
    return result
  },

  discoverAchievement: (id) => {
    const { progress } = get()
    if (progress.achievements.includes(id)) return
    const ach = ACHIEVEMENTS.find((a) => a.id === id)
    if (!ach) return
    const updated: Progress = { ...progress, achievements: [...progress.achievements, id] }
    saveProgress(updated)
    set({ progress: updated })
    get().pushToast({ title: 'ACHIEVEMENT UNLOCKED', text: `${ach.name} — ${ach.description}`, icon: ach.icon, kind: 'achievement' })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    set({ settings })
  },

  resetProgress: () => {
    const progress = { ...DEFAULT_PROGRESS }
    saveProgress(progress)
    set({ progress, levelId: 1, result: null, screen: 'menu' })
  },

  pushToast: (toast) => {
    const entry: Toast = { ...toast, id: ++toastId }
    set({ toasts: [...get().toasts, entry].slice(-3) })
    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== entry.id) })
    }, 4600)
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  setFinaleSeen: () => {
    const progress = { ...get().progress, finaleSeen: true }
    saveProgress(progress)
    set({ progress })
  },
}))

export const defaultSettings = DEFAULT_SETTINGS
