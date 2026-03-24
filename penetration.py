from dataclasses import dataclass
import random

from armor import ArmorHitResult, compute_effective_armor


@dataclass
class PenetrationResult:
    penetrated: bool
    ricochet: bool
    shell_pen_mm: float
    armor: ArmorHitResult


def penetration_at_distance(base_pen_mm: float, distance_m: float) -> float:
    # Linearized drop-off: ~20% loss at 1500m.
    loss = min(0.2, (distance_m / 1500.0) * 0.2)
    return base_pen_mm * (1.0 - loss)


def evaluate_hit(
    ammo,
    zone_name: str,
    zone_thickness_mm: float,
    impact_angle_deg: float,
    distance_m: float,
) -> PenetrationResult:
    ricochet = impact_angle_deg >= ammo.ricochet_angle_deg and random.random() < 0.85
    effective = compute_effective_armor(zone_thickness_mm, impact_angle_deg)
    armor_hit = ArmorHitResult(
        zone=zone_name,
        nominal_thickness_mm=zone_thickness_mm,
        impact_angle_deg=impact_angle_deg,
        effective_thickness_mm=effective,
        ricochet=ricochet,
    )

    pen = penetration_at_distance(ammo.penetration_0m, distance_m)
    if ricochet:
        return PenetrationResult(False, True, pen, armor_hit)

    return PenetrationResult(penetrated=pen >= effective, ricochet=False, shell_pen_mm=pen, armor=armor_hit)
