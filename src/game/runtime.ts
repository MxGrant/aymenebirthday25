import type { CarInput } from './physics'
import { emptyInput } from './physics'

export interface Telemetry {
  speed: number
  gear: number
  rpm: number
  nitro: number
  boosting: boolean
  progress: number
  collected: number
  total: number
  time: number
  timeLeft: number | null
  collisions: number
  gates: number
  gateTotal: number
  offRoad: boolean
  drift: number
  reverse: boolean
  parked: boolean
  distance: number
}

export const makeTelemetry = (): Telemetry => ({
  speed: 0,
  gear: 1,
  rpm: 0.1,
  nitro: 100,
  boosting: false,
  progress: 0,
  collected: 0,
  total: 0,
  time: 0,
  timeLeft: null,
  collisions: 0,
  gates: 0,
  gateTotal: 0,
  offRoad: false,
  drift: 0,
  reverse: false,
  parked: false,
  distance: 0,
})

export interface DriveInput {
  current: CarInput
}

export const makeInput = (): DriveInput => ({ current: emptyInput() })

export interface ParkStats {
  time: number
  collisions: number
  collected: string[]
  gates: number
  totalCollectibles: number
  objectiveMet: boolean
  failureReason: string
}
