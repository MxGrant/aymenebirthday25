# PERSONALISING THE GAME

Everything personal lives in plain data files. The engine never needs editing to change
photos, videos, messages, food, sweets or drinks.

All current food / drink / guestbook copy is **editable placeholder content** — no personal
facts, photographs or memories are invented anywhere in the game.

## 1. Photographs, videos and audio

Drop files into the stop's media folder:

```
public/media/stop-01/photo-1.jpg
public/media/stop-01/photo-2.jpg
public/media/stop-01/photo-3.jpg
public/media/stop-01/video.mp4
```

The scrapbook looks for these files automatically. Supported formats:

| Type  | Formats                          |
| ----- | -------------------------------- |
| Image | JPG, PNG, WebP, AVIF, GIF        |
| Video | MP4 (H.264), WebM                |
| Audio | MP3, WAV, OGG                    |

If a file is missing, the game shows a labelled slot with the exact path it expects — no
broken images and no console-noise. To use a different filename, set `src` on the matching
slot in `src/content/scrapbooks/*.ts` (paths are public URLs, e.g. `/media/stop-01/me.jpg`).

Keep files web-sized: images under ~400 KB (1600 px wide), videos under ~20 MB.

## 2. Written content

| What                                  | Where                                              |
| ------------------------------------- | -------------------------------------------------- |
| Stop names, objectives, environments  | `src/content/levels.ts`                            |
| Station copy, food, sweets, drinks    | `src/content/scrapbooks/london.ts` (stops 1–10)    |
|                                       | `src/content/scrapbooks/countryside.ts` (11–20)    |
|                                       | `src/content/scrapbooks/finale.ts` (21–25)         |
| Achievements                          | `src/game/progress.ts`                             |
| Finale copy                           | `src/ui/FinaleScreen.tsx` (BEATS array + stop 25)  |

Each scrapbook record looks like this:

```ts
{
  stop: 7,
  title: 'THE FOOD COURT',
  intro: '...',
  photos: [{ caption: '...', src: '/media/stop-07/photo-1.jpg' }],
  video: { caption: '...', src: '/media/stop-07/video.mp4' },
  counter: ['...', '...'],
  drinks: [{ name: '...', note: '...' }],
  sweets: [{ name: '...', note: '...' }],
  food: [{ name: '...', note: '...' }],
  guestbook: [{ from: '...', message: '...' }],
  secret: '...',
}
```

You can also preview any unlocked stop's scrapbook without driving: **SELECT LEVEL → MEMORIES**.
That is the scrapbook preview mode.

## 3. Adding or changing a stop

Every stop is a record in `src/content/levels.ts`. The engine generates the road, scenery,
station, traffic, collectibles and checkpoints from it:

```ts
{
  id: 14, name: 'THE LAKESIDE DRIVE', section: 'countryside',
  surface: 'lake', timeOfDay: 'golden', weather: 'clear',
  roadWidth: 11.5, length: 1470, curviness: 0.55, hills: 9, traffic: 1,
  collectibles: { kind: 'badge', count: 6 },
  objective: { type: 'route', label: '...', detail: '...' },
  station: { name: 'STOP 14 · LAKESIDE LODGE', style: 'country', tagline: '...' },
}
```

Available `surface` values drive the scenery and palette: `city`, `riverside`, `tunnel`, `food`,
`sweet`, `westend`, `motorway`, `country`, `village`, `hills`, `lake`, `mountain`, `forest`,
`coast`, `circuit`, `station`, `garage`.

Available station styles: `premium`, `neon`, `classic`, `country`, `coastal`, `racing` — each
changes canopy proportions, accent lighting, pillars and forecourt details.

## 4. The car

Registration **AY11 ALG** is fixed in `src/three/textures.ts` (`plateTexture`) and is used on
both plates, in the garage and in the finale. Do not change it.

## 5. Reset

Progress is stored in `localStorage` under `aymene25.progress.v2`. SETTINGS → RESET PROGRESS
clears it (useful before handing the game over).
