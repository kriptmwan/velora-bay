# Velora Bay — Open-World Crime Game

An original open-world crime game in the spirit of GTA 6, built for the
make.fun `gta6-01` competition. All city, characters, vehicles, story, art
and sounds are original — nothing from any commercial game.

**The city:** Velora Bay — a sun-soaked coastal city with seven districts
(Downtown, Neon Strip, Marina, Harbor, Old Town, Hills, Beach), 114
buildings, a road grid with traffic and pedestrians.

**The story:** Rex Delgado came home with nothing but a busted sedan and a
debt to Mama Luz. The Kane Syndicate owns the harbor, the Strip and half the
cops. Ten story missions take Rex from taxi driver to King of Velora Bay.

**Systems:**
- Drive 10 vehicles (sedans, sports cars, muscle, taxi, truck, van, SUV, pickup, bike, police cruiser) — steal any of them
- Traffic AI, pedestrians who flee gunfire, day/night cycle + weather (rain)
- Wanted system 0–5 stars: patrol cars, roadblocks at 3+, police helicopter at 4+
- On-foot and in-car combat (pistol, SMG, shotgun, rifle), explosions
- 10 story missions + taxi fares, street races, stunt jumps, 15 hidden packages, vigilante jobs
- Shops (guns, armor, food, payphone bribes, paint shop), garage, save/load
- HUD with minimap, wanted stars, health/armor, cash, mission banner, speedometer
- Synthesized WebAudio: engine, sirens, gunshots, music — no audio files

**Play:** open `game/index.html` via any static server
(`python3 -m http.server` in `game/`) and press START ENGINE.
WASD drive/walk, E enter/exit car, mouse aim + click shoot, SHIFT
sprint/handbrake, SPACE jump, H taxi job, G shop, C payphone, P pause.

**Entry:** `main.ts` copies `game/` and `screenshots/` to the output dir and
writes `dossier.json` with the kit's `buildDossier`. Run:
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`

License: MIT.
