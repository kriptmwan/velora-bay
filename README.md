# Velora Bay — Open-World Crime Game

**Velora Bay** is a 2D top-down open-world crime game built from scratch in
vanilla JavaScript (ES modules, no libraries, no network at runtime). You
are **Rex Delgado**, a cab driver pulled back into the life, fighting the
**Kane Syndicate** across seven districts of a sun-soaked coastal city —
with **Mama Luz** in your corner and fixer **Dante Cole** opening doors.

## The city

Seven districts, each with its own look: **Downtown** (glass towers, the
Kane bank), **Neon Strip** (casinos and Mama Luz's diner), **Marina**
(yachts and the night market), **Harbor** (cranes and smugglers' docks),
**Old Town** (brick lanes, St. Maria Hospital), **Hills** (the Kane
estate) and **Beach** (sand, surf and the pier races).

## Story — 10 missions

From **First Fare** (a taxi intro) through **The Debt Collector**,
**Hot Wheels** (steal the Comet GT), **Harbor Nights**, **The Informant**,
**Bank Job**, **Ambush at the Docks**, **Getaway Driver**, **Rooftop
Meeting**, to **King of Velora** — the final takedown of Marcus Kane at
his Hills estate. Press **M** to start the next mission; the objective
banner and minimap marker always show where to go.

## Side activities

- **Taxi fares** (T) — pick up, drop off, earn a tip
- **3 street races** (R) — Pier Sprint, Neon Loop, Harbor Dash, with best times
- **Stunt jumps** — hit the ramps at speed
- **15 hidden packages** — $150 each, marked on the minimap
- **Vigilante jobs** (V) — stop a marked Syndicate car in 90 seconds
- **6 shops** — Ironworks Guns, SafeHouse Gear, Mama Luz's Diner, Payphone
  Row (bribe away your wanted level), Velora Motors (buy cars), Strip
  Threads (outfits); a garage keeps the cars you own

## Systems

- **10 drivable vehicles** (sedan, coupe, Comet GT, muscle, taxi, truck,
  van, SUV, pickup, motorcycle) plus the VCPD cruiser — steal anything
  parked or in traffic with **E**
- **Wanted 0–5 stars**: cruisers chase and ram, roadblocks at 3+, a
  helicopter with a spotlight at 4+; busted or wasted and you wake up at
  St. Maria Hospital
- **Combat** on foot and drive-by — pistol, SMG, shotgun, rifle; enemies,
  explosions, pickups; pedestrians flee gunfire
- **Day/night cycle + rain**, traffic AI on the road grid, full HUD
  (minimap, wanted stars, health/armor, cash, clock, speedometer,
  objective banner), start/pause/mission-passed menus, **save/load**
  (F5 or the pause menu, localStorage), WebAudio synth (engine, sirens,
  gunfire, music)

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Space | Brake / handbrake |
| E | Enter or exit a car, open a shop |
| Q or mouse click | Shoot (aims at the mouse) |
| 1–4 | Switch weapon |
| M | Next mission |
| T | Taxi fare |
| R | Street race |
| V | Vigilante job |
| F5 | Save game |
| P / Esc | Pause |

## How to run

Serve the `game/` folder with any static server and open `index.html`:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080/
```

No build step, no network requests: every script, image and sound is a
file under `game/` or a `data:` URI.

## Playtesting

Open `game/index.html?selftest=1` to run the synchronous fixed-step
harness: boot, driving, combat, wanted escalation (3 and 4 stars),
a full mission, a taxi fare, a package pickup, save/load, shop purchase
and HUD/minimap rendering. Results land in `window.__SELFTEST__` and the
page title (`SELFTEST PASS n/n`).

Screenshot staging hooks: `?shot=chase`, `?shot=street`,
`?shot=mission`, `?shot=night` stage a scene from the live game for
capture.

## License

MIT — see `LICENSE`.
