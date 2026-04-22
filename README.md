# TankGame2.0 - Web Tank Combat Prototype

TankGame2.0 is a **fully web-based JavaScript/Three.js project** with no Python-library dependency.

## Run the game

### Prerequisites

- Node.js 18+ (recommended)
- npm (bundled with Node.js)

### Start locally

From the repository root:

```bash
npm install
npm start
```

This serves the `web_renderer/` folder using a local static server.
Open the local URL printed in the terminal (typically `http://localhost:3000`).

### Alternative start commands

If you prefer running a one-off server directly:

```bash
# Node
npx serve web_renderer

# Bun
bunx serve web_renderer
```

## Test the game

There is currently **no automated test suite** in this repository.

Use the following manual smoke-test checklist after starting the game:

1. **Launch check**
   - Page opens without console errors.
   - 3D scene renders (terrain + sky + tanks visible).
2. **Movement & camera**
   - `W/S` moves forward/reverse.
   - `A/D` steers.
   - Mouse look works after clicking canvas (pointer lock).
3. **Combat loop**
   - `LMB`/`Space` fires.
   - Ammo changes with `1`, `2`, or `Tab`.
   - Reload and ammo HUD updates correctly.
4. **View modes**
   - `V` toggles gunner sight.
   - `B` toggles binocular mode.
   - `RMB` hold zooms.
5. **Battle state**
   - Enemy AI transitions through behaviors during engagement.
   - `P` restarts battle cleanly.

### Optional quick check command

Run this command to verify the project serves without startup errors:

```bash
npm start
```

If the server starts and `web_renderer/index.html` loads in your browser, the build is healthy for this prototype.

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
- `Mouse`: aim/look (click canvas to lock pointer)
- `MMB drag`: orbit camera without pointer lock
- `LMB` or `Space`: fire
- `RMB (hold)`: zoom
- `R`: rangefinder
- `V`: toggle gunner sight mode
- `B`: toggle binocular mode
- `C` or `Left Alt`: free-look hold (third-person)
- `1`: AP ammo
- `2`: HE ammo
- `Tab`: cycle ammo
- `G`: toggle stabilizer
- `H`: toggle drive assist
- `Arrow keys`: camera yaw/pitch
- `P`: restart battle

## Project structure

- `web_renderer/index.html` - browser shell, HUD overlays, controls panel, and crosshair.
- `web_renderer/renderer.js` - renderer, gameplay state, AI behavior, and shell simulation.
- `assets/textures/` - project textures.
