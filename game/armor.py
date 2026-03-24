import math

def zone_from_local_hit(p):
    if p.y > 1.9: return "turret"
    if p.z > 0.8: return "front"
    if p.z < -1.4: return "rear"
    if abs(p.x) > 1.2: return "side"
    return "front"

def effective_armor_mm(nominal_mm: float, impact_angle_deg: float) -> float:
    a = min(max(impact_angle_deg, 0.0), 89.0)
    return nominal_mm / max(0.01, math.cos(math.radians(a)))