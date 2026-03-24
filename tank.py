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
        hull_tint = color.rgb(156, 86, 72) if is_enemy else tint
        super().__init__(
            model="cube",
            color=hull_tint,
            position=position,
            scale=(3.8, 1.2, 5.2),
            collider=None,
            name=name,
        )
        self.spec = DEFAULT_TANK_SPEC

        turret_tint = color.rgb(178, 104, 87) if is_enemy else tint.tint(0.1)
        self.turret = Entity(parent=self, model="cube", color=turret_tint, y=1.2, scale=(2.5, 0.8, 2.6))
        self.gun_pivot = Entity(parent=self.turret, y=0.15, z=0.8)
        self.gun = Entity(parent=self.gun_pivot, model="cube", color=color.dark_gray, scale=(0.26, 0.26, 2.8), z=1.3)
        self.muzzle = Entity(parent=self.gun_pivot, model="cube", color=color.yellow, scale=(0.08, 0.08, 0.08), z=2.7)

        # A small visual mast makes enemy vehicles easy to identify at range.
        if is_enemy:
            Entity(parent=self.turret, model="cube", color=color.red, y=0.7, z=-0.5, scale=(0.15, 0.7, 0.15))

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
