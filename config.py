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
        name="AP",
        muzzle_velocity=930.0,
        penetration_0m=250.0,
        he_power=25.0,
        reload_time=7.0,
        ricochet_angle_deg=70.0,
    ),
    "HE": AmmoSpec(
        name="HE",
        muzzle_velocity=760.0,
        penetration_0m=55.0,
        he_power=120.0,
        reload_time=6.0,
        ricochet_angle_deg=78.0,
    ),
}


DEFAULT_TANK_SPEC = TankSpec(
    name="Prototype MBT",
    mass_tons=48.0,
    max_forward_speed=12.0,
    max_reverse_speed=5.0,
    acceleration=2.4,
    braking=5.0,
    hull_turn_rate_deg=22.0,
    turret_turn_rate_deg=16.0,
    gun_elevation_rate_deg=10.0,
    gun_min_pitch_deg=-8.0,
    gun_max_pitch_deg=20.0,
    detection_range=260.0,
    fire_align_tolerance_deg=2.4,
    armor_zones={
        "front": ArmorZoneSpec("front", 220.0),
        "side": ArmorZoneSpec("side", 90.0),
        "rear": ArmorZoneSpec("rear", 60.0),
        "turret": ArmorZoneSpec("turret", 180.0),
    },
)


MODULE_LAYOUT: Dict[str, Tuple[Tuple[float, float, float], ModuleSpec]] = {
    # Local-space positions in hull coordinates used for coarse post-penetration module checks.
    "crew": ((0.0, 1.3, -0.6), ModuleSpec("crew", 100.0)),
    "engine": ((0.0, 1.0, -2.2), ModuleSpec("engine", 90.0)),
    "transmission": ((0.0, 0.9, 1.7), ModuleSpec("transmission", 80.0)),
    "tracks": ((1.7, 0.5, 0.0), ModuleSpec("tracks", 120.0)),
    "gun_breech": ((0.0, 2.2, 1.0), ModuleSpec("gun_breech", 70.0)),
    "ammo_rack": ((-0.8, 1.1, -0.8), ModuleSpec("ammo_rack", 60.0)),
}


BATTLEFIELD_SIZE = 260
DEBUG_FONT_SCALE = 0.85
