from dataclasses import dataclass
from math import acos, degrees

from ursina import Entity, Vec3, color, destroy, time

from armor import classify_armor_zone
from penetration import evaluate_hit


@dataclass
class ProjectileDebug:
    velocity: float = 0.0
    impact_angle_deg: float = 0.0
    armor_zone: str = "none"
    effective_armor: float = 0.0
    penetrated: bool = False
    module_hit: str = "none"
    note: str = ""


class Shell(Entity):
    def __init__(self, owner_tank, ammo, position, direction, game):
        super().__init__(
            model="sphere",
            color=color.yellow,
            scale=0.07,
            position=position,
            collider=None,
        )
        self.owner_tank = owner_tank
        self.ammo = ammo
        self.velocity = direction.normalized() * ammo.muzzle_velocity
        self.life = 0.0
        self.game = game

    def update(self):
        dt = time.dt
        self.life += dt
        if self.life > 8.0:
            destroy(self)
            return

        self.velocity += Vec3(0, -self.ammo.gravity, 0) * dt
        self.position += self.velocity * dt

        for tank in self.game.tanks:
            if tank is self.owner_tank or tank.damage_model.state.destroyed:
                continue
            if (self.position - tank.world_position).length() > 4.2:
                continue

            local_hit = tank.localize_point(self.position)
            if abs(local_hit.x) > 2.2 or local_hit.y < 0.0 or local_hit.y > 3.3 or abs(local_hit.z) > 2.8:
                continue

            self._resolve_hit(tank, local_hit)
            destroy(self)
            return

    def _resolve_hit(self, tank, local_hit):
        zone = classify_armor_zone(local_hit)
        zone_spec = tank.spec.armor_zones[zone]

        shell_dir = self.velocity.normalized()
        normal = tank.zone_normal_world(zone, local_hit)
        dot = max(-1.0, min(1.0, -shell_dir.dot(normal)))
        impact_angle = degrees(acos(dot))

        distance_m = (self.position - self.owner_tank.muzzle.world_position).length()
        result = evaluate_hit(self.ammo, zone, zone_spec.thickness_mm, impact_angle, distance_m)

        dbg = ProjectileDebug(
            velocity=self.velocity.length(),
            impact_angle_deg=impact_angle,
            armor_zone=zone,
            effective_armor=result.armor.effective_thickness_mm,
            penetrated=result.penetrated,
            note="RICHOCHET" if result.ricochet else "PEN" if result.penetrated else "STOPPED",
        )

        if result.penetrated:
            energy_scale = max(0.6, result.shell_pen_mm / max(1.0, result.armor.effective_thickness_mm))
            tank.damage_model.apply_penetration(local_hit, energy_scale)
            dbg.module_hit = tank.damage_model.state.last_module_hit
        else:
            tank.damage_model.apply_non_penetration(self.ammo.he_power)

        self.game.debug_state = dbg
