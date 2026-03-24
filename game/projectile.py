from math import acos, degrees
from ursina import Entity, Vec3, color, destroy, time
from armor import zone_from_local_hit
from penetration import resolve_pen

class Shell(Entity):
    def __init__(self, owner, ammo, pos, direction, game):
        super().__init__(model="sphere", color=color.yellow, scale=0.07, position=pos)
        self.owner = owner
        self.ammo = ammo
        self.vel = direction.normalized() * ammo.muzzle_velocity
        self.game = game
        self.life = 0.0

    def update(self):
        self.life += time.dt
        if self.life > 8:
            destroy(self); return

        self.vel += Vec3(0, -9.81, 0) * time.dt
        self.position += self.vel * time.dt

        for t in self.game.tanks:
            if t is self.owner or t.damage.destroyed: continue
            if self.position.distance_to(t.world_position) > 4.2: continue
            local = t.localize(self.position)
            if abs(local.x) > 2.2 or local.y < 0 or local.y > 3.3 or abs(local.z) > 2.8: continue

            zone = zone_from_local_hit(local)
            armor = t.armor[zone]
            normal = t.zone_normal(zone, local)
            dot = max(-1, min(1, -self.vel.normalized().dot(normal)))
            angle = degrees(acos(dot))
            dist = self.position.distance_to(self.owner.muzzle.world_position)
            r = resolve_pen(self.ammo, armor, angle, dist)

            self.game.debug = f"v={self.vel.length():.1f} angle={angle:.1f} zone={zone} eff={r['effective_mm']:.1f} pen={r['penetrated']}"
            if r["penetrated"]:
                t.damage.apply_pen()
            else:
                t.damage.apply_non_pen(self.ammo.he_power)

            destroy(self); return