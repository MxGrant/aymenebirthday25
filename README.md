# AY MENE 25 — THE ULTIMATE ROAD TRIP

A 3D browser driving game built as a 25th-birthday gift: 25 stops, one black
supercar registered **AY11 ALG**, a petrol station and a scrapbook at the end of
every leg, and a finale worth arriving for.

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build in dist/
npm run typecheck
```

## Controls

| Action | Keys |
| --- | --- |
| Accelerate | W / ↑ |
| Brake / reverse | S / ↓ |
| Steer | A D / ← → |
| Handbrake (drift) | SPACE |
| Nitro | SHIFT |
| Cinematic camera | C |
| Enter station / retry | E / R |
| Pause | ESC |

Touch controls appear automatically on phones and small screens.

## The journey

25 stops in three chapters — London (1–10), the countryside (11–20) and the
final run (21–25). Every stop has its own road, weather, surface, objective,
collectibles and petrol station. Parking in the illuminated bay ends the leg,
finishing the stop unlocks the next one, and progress is saved to
`localStorage` (`aymene25.progress.v2`).

Each station holds nothing but its photo wall: the stop's photographs, hung as
polaroids with their captions. Empty slots show a clearly labelled placeholder
until you add your own media.

## Adding photographs, video and audio

Drop files into `public/media/stop-NN/` using the names the scrapbook expects
(`photo-1.jpg`, `video.mp4`, …). See `public/media/README.md` for the file
conventions and `CONTENT.md` for every editable line of copy.

Nothing personal is invented: photographs, the counter message, the guestbook
and every favourite drink, sweet and meal are placeholders for you to replace.

## Project layout

```
src/game/       engine — physics, procedural track, audio, progress, store
src/content/    the 25 stop definitions and their scrapbooks
src/three/      car, garage, world and finale scenes (React Three Fiber)
src/ui/         menu, garage, route map, HUD, stations, finale
src/dev/        dev-only autopilot + level simulator used for playtests
```

`src/dev` and the `__aymene*` test hooks only load in `npm run dev`; they are
removed from production builds.
