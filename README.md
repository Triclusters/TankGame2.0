# TankGame2.0 - Ursina Tank Simulator Prototype

A modular 3D tank combat prototype in Python + Ursina focused on realistic behavior (movement inertia, turret handling, ballistics, armor penetration, and internal module damage) using placeholder visuals.

## Run

```bash
pip install ursina
python main.py
```

## Controls

- `W/S`: throttle forward/reverse
- `A/D`: hull steering
- `Mouse`: turret traverse + gun elevation
- `Left Mouse`: fire
- `1`: AP ammo
- `2`: HE ammo
- `Tab`: cycle ammo
- `V`: gunner zoom
- `R`: restart battle
- `Esc`: unlock mouse cursor

## Project structure

- `main.py` - app bootstrap, loop, environment, phase summaries
- `tank.py` - tank entity assembly and shared tank logic
- `movement.py` - heavy movement model and hull steering
- `turret.py` - independent turret + gun control
- `projectile.py` - shell simulation and impact processing
- `armor.py` - armor zones and effective-thickness math
- `penetration.py` - penetration and ricochet logic
- `damage.py` - internal module damage and kill states
- `ai.py` - enemy behavior
- `hud.py` - reticle, reload/ammo/status/debug UI
- `config.py` - tunable data models and constants
