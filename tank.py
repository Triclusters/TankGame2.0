from math import cos, radians, sin

from ursina import Entity, Vec3, color, time

from config import AMMO_TYPES, DEFAULT_TANK_SPEC, MODULE_LAYOUT
from damage import DamageModel
from movement import TankMovementController
from projectile import Shell
from turret import TurretController


class Tank(Entity):
    def __init__(self, position=(0, 0, 0), tint=color.gray, name="tank"):
        is_enemy = name == "enemy"
        hull_tint = color.rgb(120, 108, 84) if is_enemy else color.rgb(112, 122, 88)
        super().__init__(
            model="cube",
            color=hull_tint,
            position=position,
            scale=(3.2, 1.0, 5.8),
            collider=None,
            name=name,
        )
        self.spec = DEFAULT_TANK_SPEC

        turret_tint = hull_tint.tint(0.06 if is_enemy else 0.02)
        self.turret = Entity(parent=self, model="cube", color=turret_tint, y=1.03, scale=(2.25, 0.78, 2.75))
        self.gun_pivot = Entity(parent=self.turret, y=0.14, z=1.0)
        self.gun = Entity(parent=self.gun_pivot, model="cube", color=color.dark_gray, scale=(0.2, 0.2, 3.15), z=1.52)
        self.muzzle = Entity(parent=self.gun_pivot, model="cube", color=color.yellow, scale=(0.11, 0.11, 0.11), z=3.04)
        self.cupola = Entity(parent=self.turret, model="cube", color=turret_tint.tint(0.05), x=-0.36, y=0.36, z=-0.24, scale=(0.46, 0.24, 0.46))
        self.side_skirt_left = Entity(parent=self, model="cube", color=hull_tint.tint(0.03), x=-1.68, y=-0.08, scale=(0.12, 0.6, 4.8))
        self.side_skirt_right = Entity(parent=self, model="cube", color=hull_tint.tint(0.03), x=1.68, y=-0.08, scale=(0.12, 0.6, 4.8))

        # A small visual mast makes enemy vehicles easy to identify at range.
        if is_enemy:
            Entity(parent=self.turret, model="cube", color=color.red, y=0.63, z=-0.72, scale=(0.13, 0.5, 0.13))

        self.movement = TankMovementController(self, self.spec)
        self.turret_controller = TurretController(self, self.spec)
        self.damage_model = DamageModel(MODULE_LAYOUT)

        self.current_ammo_type = "AP"
        self.reload_timer = 0.0
        self.current_reload = AMMO_TYPES[self.current_ammo_type].reload_time

    def update_common(self):
        if self.reload_timer > 0:
            self.reload_timer = max(0.0, self.reload_timer - time.dt)

    def cycle_ammo(self):
        self.current_ammo_type = "HE" if self.current_ammo_type == "AP" else "AP"
        self.current_reload = AMMO_TYPES[self.current_ammo_type].reload_time

    def try_fire(self, game):
        if self.reload_timer > 0 or self.damage_model.state.firepower_kill:
            return False

        ammo = AMMO_TYPES[self.current_ammo_type]
        shell_direction = (self.muzzle.world_position - self.gun_pivot.world_position).normalized()
        Shell(
            owner_tank=self,
            ammo=ammo,
            position=self.muzzle.world_position + shell_direction * 0.2,
            direction=shell_direction,
            game=game,
        )
        self.reload_timer = ammo.reload_time
        self.current_reload = ammo.reload_time
        return True

    def sample_terrain_height(self, x, z):
        # Light-weight synthetic terrain to avoid heavy mesh collision setup.
        return 0.12 * sin(x * 0.05) + 0.1 * cos(z * 0.045)

    def localize_point(self, world_point: Vec3):
        rel = world_point - self.world_position
        yaw = radians(-self.rotation_y)
        lx = rel.x * cos(yaw) - rel.z * sin(yaw)
        lz = rel.x * sin(yaw) + rel.z * cos(yaw)
        return Vec3(lx, rel.y, lz)

    def zone_normal_world(self, zone, local_hit):
        side_sign = 1 if local_hit.x >= 0 else -1
        normals = {
            "front": Vec3(0, 0, 1),
            "rear": Vec3(0, 0, -1),
            "side": Vec3(side_sign, 0, 0),
            "turret": Vec3(0, 0.1, 1),
        }
        local = normals.get(zone, Vec3(0, 0, 1)).normalized()
        yaw = radians(self.rotation_y)
        wx = local.x * cos(yaw) - local.z * sin(yaw)
        wz = local.x * sin(yaw) + local.z * cos(yaw)
        return Vec3(wx, local.y, wz).normalized()
