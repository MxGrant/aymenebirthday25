import type { LevelSpec, TimeOfDay } from './types'

export interface WorldPalette {
  skyTop: string
  skyBottom: string
  sunColor: string
  sunIntensity: number
  sunPosition: [number, number, number]
  ambient: number
  hemiSky: string
  hemiGround: string
  fogColor: string
  fogNear: number
  fogFar: number
  ground: string
  groundAlt: string
  road: string
  roadRoughness: number
  roadMetalness: number
  line: string
  building: string
  buildingAlt: string
  window: string
  foliage: string
  foliageAlt: string
  trunk: string
  rock: string
  accent: string
  lamps: boolean
  lampColor: string
  wet: boolean
  stars: boolean
  water: string
}

const base: WorldPalette = {
  skyTop: '#7fa8cf',
  skyBottom: '#dfe8ef',
  sunColor: '#fff4e2',
  sunIntensity: 2.1,
  sunPosition: [80, 120, 40],
  ambient: 0.55,
  hemiSky: '#cfe3f5',
  hemiGround: '#5c5a4c',
  fogColor: '#c9d4da',
  fogNear: 120,
  fogFar: 900,
  ground: '#5d6b3f',
  groundAlt: '#4b5734',
  road: '#2a2c30',
  roadRoughness: 0.86,
  roadMetalness: 0.04,
  line: '#e8e8e4',
  building: '#8c8b88',
  buildingAlt: '#6d6c69',
  window: '#a9c6d8',
  foliage: '#3c5a2d',
  foliageAlt: '#4d6c34',
  trunk: '#3a2e24',
  rock: '#6a6560',
  accent: '#d5c5a1',
  lamps: false,
  lampColor: '#ffd9a0',
  wet: false,
  stars: false,
  water: '#3f5d68',
}

const timeOfDayPalette: Record<TimeOfDay, Partial<WorldPalette>> = {
  day: {},
  golden: {
    skyTop: '#5f86b8',
    skyBottom: '#f2c79a',
    sunColor: '#ffd7a1',
    sunIntensity: 2.5,
    sunPosition: [-120, 42, 60],
    ambient: 0.5,
    hemiSky: '#ffd9b0',
    hemiGround: '#4a4232',
    fogColor: '#e6c9a8',
    fogNear: 140,
    fogFar: 820,
    ground: '#6a6c3d',
    groundAlt: '#565733',
    building: '#8a7f72',
    buildingAlt: '#6b6156',
    window: '#ffd9a0',
    lampColor: '#ffcf8a',
    accent: '#e8cf9f',
  },
  sunset: {
    skyTop: '#2b2740',
    skyBottom: '#ff8a4c',
    sunColor: '#ff9d55',
    sunIntensity: 1.9,
    sunPosition: [-160, 26, -40],
    ambient: 0.34,
    hemiSky: '#ffb078',
    hemiGround: '#2a2020',
    fogColor: '#d98a63',
    fogNear: 90,
    fogFar: 620,
    ground: '#4e4a31',
    groundAlt: '#3c3a28',
    building: '#5c5250',
    buildingAlt: '#443c3c',
    window: '#ffb86b',
    foliage: '#33452a',
    foliageAlt: '#3f5530',
    rock: '#5a4f49',
    accent: '#ffb37a',
    lamps: true,
    lampColor: '#ffcf8a',
  } as Partial<WorldPalette>,
  night: {
    skyTop: '#04060c',
    skyBottom: '#141a26',
    sunColor: '#9fb8ff',
    sunIntensity: 0.35,
    sunPosition: [40, 90, -60],
    ambient: 0.24,
    hemiSky: '#25334d',
    hemiGround: '#0a0b0e',
    fogColor: '#0a0f18',
    fogNear: 60,
    fogFar: 480,
    ground: '#1d2420',
    groundAlt: '#161b18',
    road: '#1a1c20',
    roadRoughness: 0.55,
    roadMetalness: 0.2,
    line: '#e9e4d6',
    building: '#171b22',
    buildingAlt: '#11141a',
    window: '#ffcf8d',
    foliage: '#16251a',
    foliageAlt: '#1b2d1f',
    trunk: '#1a1512',
    rock: '#2a2a2c',
    accent: '#d5c5a1',
    lamps: true,
    lampColor: '#ffd6a0',
    stars: true,
    water: '#101a26',
  },
}

const surfacePalette: Record<string, Partial<WorldPalette>> = {
  city: {
    ground: '#4a4d44',
    building: '#7b7d80',
    buildingAlt: '#606367',
    window: '#b9d6e4',
    road: '#282a2e',
    foliage: '#3c5a2d',
  },
  riverside: { water: '#3d5a68', ground: '#5a6350' },
  tunnel: {
    skyTop: '#05070a',
    skyBottom: '#0a0d12',
    fogColor: '#070a0f',
    fogNear: 20,
    fogFar: 220,
    ground: '#24262a',
    road: '#232529',
    ambient: 0.2,
    sunIntensity: 0.15,
    lamps: true,
    lampColor: '#c8e6ff',
  },
  sweet: {
    ground: '#7a6a53',
    building: '#c9a7a0',
    buildingAlt: '#a98a86',
    window: '#ffe6c9',
    accent: '#ffd6e0',
  },
  food: {
    ground: '#5c5544',
    building: '#9c7a58',
    buildingAlt: '#7d6247',
    window: '#ffd9a0',
    accent: '#e6b473',
  },
  westend: {
    ground: '#4c4a44',
    building: '#8d8078',
    buildingAlt: '#6a6058',
    window: '#ffcf8d',
    accent: '#f0b45a',
  },
  motorway: { ground: '#525a45', road: '#2b2d31', fogFar: 1100 },
  country: {
    ground: '#5f7038',
    groundAlt: '#4a5a2c',
    foliage: '#40602a',
    foliageAlt: '#557a30',
    fogColor: '#cfd8cc',
    accent: '#cbb98a',
  },
  village: {
    ground: '#65703f',
    building: '#b9a68a',
    buildingAlt: '#94816a',
    window: '#ffe1ad',
    accent: '#c8b58e',
  },
  hills: { ground: '#5a6b36', groundAlt: '#47542b' },
  lake: { water: '#3a5763', ground: '#4e6437', fogColor: '#c2d0d4' },
  mountain: {
    ground: '#5a5f52',
    groundAlt: '#484c42',
    rock: '#6d6a64',
    foliage: '#2f4a2c',
    fogColor: '#b9c3c8',
    sunIntensity: 2.2,
  },
  forest: { ground: '#3d4b2e', groundAlt: '#2f3b24', foliage: '#2f4a24', fogColor: '#aebfae' },
  coast: {
    ground: '#6b6a48',
    groundAlt: '#55553a',
    water: '#2f5468',
    fogColor: '#c8d6dd',
    accent: '#e0d3b0',
  },
  circuit: {
    ground: '#4a5140',
    groundAlt: '#3c4234',
    road: '#25262a',
    building: '#8a8a86',
    accent: '#a82430',
    fogColor: '#c4ccd2',
    fogFar: 1000,
  },
  station: { ground: '#4c4f45', accent: '#d5c5a1' },
  garage: {
    ground: '#141518',
    building: '#1c1e22',
    ambient: 0.2,
    sunIntensity: 0.1,
    fogColor: '#0b0c0e',
    fogNear: 10,
    fogFar: 120,
    lamps: true,
    lampColor: '#e8f0ff',
  },
}

export function paletteFor(level: LevelSpec): WorldPalette {
  const p: WorldPalette = { ...base, ...timeOfDayPalette[level.timeOfDay], ...surfacePalette[level.surface] }

  if (level.weather === 'rain') {
    p.wet = true
    p.roadRoughness = 0.22
    p.roadMetalness = 0.42
    p.fogColor = level.timeOfDay === 'night' ? '#0b1018' : '#9aa7ae'
    p.fogNear = 50
    p.fogFar = 420
    p.sunIntensity *= 0.55
    p.ambient *= 0.9
    p.skyTop = level.timeOfDay === 'night' ? '#070a10' : '#5c6a74'
    p.skyBottom = level.timeOfDay === 'night' ? '#151c26' : '#a8b4ba'
    p.ground = '#3f4a35'
  }
  if (level.weather === 'fog') {
    p.fogNear = 25
    p.fogFar = 260
    p.fogColor = level.timeOfDay === 'night' ? '#111722' : '#c3cbcd'
    p.ambient *= 1.05
    p.sunIntensity *= 0.7
  }

  // Station / garage levels are lit differently from open road.
  if (level.surface === 'garage') {
    p.road = '#1b1d21'
  }

  return p
}

export const SECTION_META: Record<string, { title: string; subtitle: string; accent: string }> = {
  london: { title: 'THE LONDON RUN', subtitle: 'STOPS 01 — 10', accent: '#a82430' },
  countryside: { title: 'THE COUNTRY ESCAPE', subtitle: 'STOPS 11 — 20', accent: '#7d8f5a' },
  final: { title: 'THE FINAL GRAND TOUR', subtitle: 'STOPS 21 — 25', accent: '#d5c5a1' },
}
