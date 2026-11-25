import type { Scrapbook } from '../../game/types'
import { LONDON_SCRAPBOOKS } from './london'
import { COUNTRYSIDE_SCRAPBOOKS } from './countryside'
import { FINALE_SCRAPBOOKS } from './finale'

export const SCRAPBOOKS: Scrapbook[] = [...LONDON_SCRAPBOOKS, ...COUNTRYSIDE_SCRAPBOOKS, ...FINALE_SCRAPBOOKS]

export function getScrapbook(stop: number): Scrapbook {
  return SCRAPBOOKS.find((s) => s.stop === stop) ?? SCRAPBOOKS[0]
}

/** Conventional media locations — drop files here and they appear automatically. */
export function mediaPath(stop: number, file: string) {
  return `/media/stop-${String(stop).padStart(2, '0')}/${file}`
}
