from dataclasses import dataclass

@dataclass(frozen=True)
class Ammo:
    name: str
    muzzle_velocity: float
    pen_mm: float
    he_power: float
    reload_s: float
    ricochet_deg: float

AMMO = {
    "AP": Ammo("AP", 930, 250, 20, 7.0, 70),
    "HE": Ammo("HE", 760, 55, 120, 6.0, 78),
}

TANK = {
    "max_fwd": 12.0,
    "max_rev": 5.0,
    "accel": 2.4,
    "brake": 5.0,
    "hull_turn": 22.0,
    "turret_turn": 16.0,
    "gun_pitch_rate": 10.0,
    "pitch_min": -8.0,
    "pitch_max": 20.0,
    "detect_range": 260.0,
}

ARMOR = {
    "front": 220.0,
    "side": 90.0,
    "rear": 60.0,
    "turret": 180.0,
}

MODULE_HP = {
    "crew": 100.0,
    "engine": 90.0,
    "transmission": 80.0,
    "tracks": 120.0,
    "gun_breech": 70.0,
    "ammo_rack": 60.0,
}