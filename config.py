from dataclasses import dataclass, field
from typing import Dict, Tuple


@dataclass(frozen=True)
class AmmoSpec:
    name: str
    muzzle_velocity: float
    penetration_0m: float
    he_power: float
    reload_time: float
    ricochet_angle_deg: float
    gravity: float = 9.81


@dataclass(frozen=True)
class ArmorZoneSpec:
    name: str
    thickness_mm: float


@dataclass(frozen=True)
class ModuleSpec:
    name: str
    max_hp: float


@dataclass(frozen=True)
class TankSpec:
    name: str
    mass_tons: float
    max_forward_speed: float
    max_reverse_speed: float
    acceleration: float
    braking: float
    hull_turn_rate_deg: float
    turret_turn_rate_deg: float
    gun_elevation_rate_deg: float
    gun_min_pitch_deg: float
    gun_max_pitch_deg: float
    detection_range: float
    fire_align_tolerance_deg: float
    armor_zones: Dict[str, ArmorZoneSpec] = field(default_factory=dict)


AMMO_TYPES: Dict[str, AmmoSpec] = {
    "AP": AmmoSpec(
        name="75mm APCBC",
        muzzle_velocity=750.0,
        penetration_0m=135.0,
        he_power=35.0,
        reload_time=6.4,
        ricochet_angle_deg=68.0,
    ),
    "HE": AmmoSpec(
        name="75mm HE",
        muzzle_velocity=550.0,
        penetration_0m=28.0,
        he_power=155.0,
        reload_time=6.0,
        ricochet_angle_deg=78.0,
    ),
}


DEFAULT_TANK_SPEC = TankSpec(
    name="Panzer IV F2",
    mass_tons=23.6,
    max_forward_speed=10.5,
    max_reverse_speed=2.9,
    acceleration=1.7,
    braking=3.9,
    hull_turn_rate_deg=18.5,
    turret_turn_rate_deg=13.0,
    gun_elevation_rate_deg=6.0,
    gun_min_pitch_deg=-10.0,
    gun_max_pitch_deg=20.0,
    detection_range=210.0,
    fire_align_tolerance_deg=2.1,
    armor_zones={
        "front": ArmorZoneSpec("front", 80.0),
        "side": ArmorZoneSpec("side", 30.0),
        "rear": ArmorZoneSpec("rear", 20.0),
        "turret": ArmorZoneSpec("turret", 50.0),
    },
)


MODULE_LAYOUT: Dict[str, Tuple[Tuple[float, float, float], ModuleSpec]] = {
    # Panzer IV F2 inspired layout (aggregated by system for this prototype).
    "crew": ((0.15, 1.45, 0.55), ModuleSpec("crew", 110.0)),
    "engine": ((0.0, 1.05, -2.05), ModuleSpec("engine", 85.0)),
    "transmission": ((0.0, 0.95, 1.95), ModuleSpec("transmission", 95.0)),
    "tracks": ((1.7, 0.45, 0.0), ModuleSpec("tracks", 125.0)),
    "gun_breech": ((0.0, 2.0, 1.05), ModuleSpec("gun_breech", 78.0)),
    "ammo_rack": ((-0.95, 1.1, -0.35), ModuleSpec("ammo_rack", 65.0)),
}


BATTLEFIELD_SIZE = 260
DEBUG_FONT_SCALE = 0.85
