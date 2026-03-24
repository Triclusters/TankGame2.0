import random
from armor import effective_armor_mm

def pen_at_distance(base_pen, dist_m):
    loss = min(0.2, (dist_m / 1500.0) * 0.2)
    return base_pen * (1.0 - loss)

def resolve_pen(ammo, armor_mm, angle_deg, dist_m):
    ricochet = angle_deg >= ammo.ricochet_deg and random.random() < 0.85
    eff = effective_armor_mm(armor_mm, angle_deg)
    pen = pen_at_distance(ammo.pen_mm, dist_m)
    return {
        "ricochet": ricochet,
        "effective_mm": eff,
        "pen_mm": pen,
        "penetrated": (not ricochet) and pen >= eff,
    }