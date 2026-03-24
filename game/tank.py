from math import sin, cos, radians
from ursina import Entity, Vec3, color, time
from config import AMMO, TANK, ARMOR
from movement import Movement
from turret import Turret
from damage import DamageModel
from projectile import Shell

class Tank(Entity):
    def __init__(self, pos=(0,0,0), tint=color.gray):
        super().__init__(model="cube", color=tint, position=pos, scale=(3.8,1.2,5.2))
        self.cfg = TANK
        self.armor = ARMOR
        self.turret = Entity(parent=self, model="cube", color=tint.tint(0.1), y=1.2, scale=(2.5,.8,2.6))
        self.gun_pivot = Entity(parent=self.turret, y=.15, z=.8)
        self.gun = Entity(parent=self.gun_pivot, model="cube", color=color.dark_gray, scale=(.26,.26,2.8), z=1.3)
        self.muzzle = Entity(parent=self.gun_pivot, model="cube", color=color.yellow, scale=(.08,.08,.08), z=2.7)

        self.move = Movement(self, self.cfg)
        self.turret_ctrl = Turret(self, self.cfg)
        self.damage = DamageModel()

        self.ammo_type = "AP"
        self.reload_timer = 0.0
        self.reload = AMMO[self.ammo_type].reload_s

    def tick(self):
        if self.reload_timer > 0:
            self.reload_timer = max(0, self.reload_timer - time.dt)

    def try_fire(self, game):
        if self.reload_timer > 0 or self.damage.firepower_kill: return False
        ammo = AMMO[self.ammo_type]
        d = (self.muzzle.world_position - self.gun_pivot.world_position).normalized()
        Shell(self, ammo, self.muzzle.world_position + d*0.2, d, game)
        self.reload_timer = ammo.reload_s
        self.reload = ammo.reload_s
        return True

    def localize(self, wp):
        rel = wp - self.world_position
        y = radians(-self.rotation_y)
        return Vec3(rel.x*cos(y)-rel.z*sin(y), rel.y, rel.x*sin(y)+rel.z*cos(y))

    def zone_normal(self, zone, local):
        side = 1 if local.x >= 0 else -1
        n = {"front":Vec3(0,0,1),"rear":Vec3(0,0,-1),"side":Vec3(side,0,0),"turret":Vec3(0,.1,1)}[zone].normalized()
        y = radians(self.rotation_y)
        return Vec3(n.x*cos(y)-n.z*sin(y), n.y, n.x*sin(y)+n.z*cos(y)).normalized()