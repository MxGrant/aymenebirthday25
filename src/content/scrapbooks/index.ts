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

export const SCRAPBOOK_OBJECTS = [
  { key: 'photos', label: 'PHOTO WALL', hint: 'Photographs and captions' },
  { key: 'video', label: 'TELEVISION', hint: 'The stop’s video clip' },
  { key: 'counter', label: 'COUNTER', hint: 'Written birthday message' },
  { key: 'drinks', label: 'DRINKS FRIDGE', hint: 'Favourite beverages' },
  { key: 'sweets', label: 'SWEET SHELF', hint: 'Desserts and jokes' },
  { key: 'food', label: 'FOOD DISPLAY', hint: 'Meals and snacks' },
  { key: 'guestbook', label: 'GUESTBOOK', hint: 'Messages from the committee' },
  { key: 'secret', label: 'HIDDEN DRAWER', hint: 'Something is in here' },
] as const

export type ScrapbookObjectKey = (typeof SCRAPBOOK_OBJECTS)[number]['key']
