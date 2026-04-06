# TankGame2.0 - Web Tank Combat Prototype

TankGame2.0 is now a **fully web-based JavaScript/Three.js project** with no Python-library dependency.

## Run

Use any static file server and open `web_renderer/index.html`.

```bash
# Node
npx serve web_renderer

# Bun
bunx serve web_renderer
```

Then open the local URL printed by the server.

## Included features

- Dynamic sky dome, fog, and filmic lighting.
- Sculpted terrain mesh, clutter, and cover volumes.
- Player/enemy tanks with hull + turret + gun transforms.
- View modes: third-person, gunner sight, and binocular mode.
- AP/HE ammo, reload logic, ballistic shell drop, and impact damage.
- Module-style damage (engine/gun/turret/crew) and destruction states.
- Enemy AI state machine: **push**, **take cover**, **snipe** (imperfect aim).
- HUD overlays for ammo/reload, HP, module status, AI state, speed, heading, and battle event feed.
- Terrain-conforming tank positioning and instant battle restart support.
- War Thunder-style inspired hit-cam panel showing shot path, penetration result, and damaged module (shown only when damage occurs).

## Controls

- `W/S`: throttle forward/reverse
- `A/D`: hull steering
- `Shift`: temporary power boost
- `Mouse`: aim/look (click canvas to lock pointer)
- `LMB` or `Space`: fire
- `RMB (hold)`: zoom
- `Q/E`: turret trim
- `R/F`: gun elevation trim
- `V`: toggle gunner sight mode
- `B`: toggle binocular mode
- `C`: free-look toggle (third-person)
- `X`: rangefinder
- `1`: AP ammo
- `2`: HE ammo
- `Tab`: cycle ammo
- `R`: restart battle

## Project structure

- `web_renderer/index.html` - browser shell, HUD overlays, controls panel, and crosshair.
- `web_renderer/renderer.js` - renderer, gameplay state, AI behavior, and shell simulation.
- `assets/textures/` - project textures.
