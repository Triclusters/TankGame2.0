from dataclasses import dataclass


@dataclass
class ArmorHitResult:
    zone: str
    nominal_thickness_mm: float
    impact_angle_deg: float
    effective_thickness_mm: float
    ricochet: bool


def classify_armor_zone(local_hit_point):
    x, y, z = local_hit_point.x, local_hit_point.y, local_hit_point.z
    if y > 1.9:
        return "turret"
    if z > 0.8:
        return "front"
    if z < -1.4:
        return "rear"
    if abs(x) > 1.2:
        return "side"
    return "front"


def compute_effective_armor(nominal_mm: float, impact_angle_deg: float) -> float:
    # Simplified LOS armor: divide by cosine of impact angle from the normal.
    import math

    angle = min(max(impact_angle_deg, 0.0), 89.0)
    return nominal_mm / max(0.01, math.cos(math.radians(angle)))
