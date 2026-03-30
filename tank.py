from math import cos, radians, sin

from ursina import Entity, Vec3, color, destroy, invoke, lit_with_shadows_shader, scene, time

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
            texture="assets/textures/metal.ppm",
            color=hull_tint,
            position=position,
            scale=(3.2, 1.0, 5.8),
            collider=None,
            name=name,
        )
        self.spec = DEFAULT_TANK_SPEC

        turret_tint = hull_tint.tint(0.06 if is_enemy else 0.02)
        self.turret = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=turret_tint,
            y=1.03,
            scale=(2.25, 0.78, 2.75),
        )
        self.gun_pivot = Entity(parent=self.turret, y=0.14, z=1.0)
        self.gun = Entity(
            parent=self.gun_pivot,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(64, 64, 68),
            scale=(0.2, 0.2, 3.15),
            z=1.52,
        )
        self.muzzle = Entity(
            parent=self.gun_pivot,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(190, 160, 90),
            scale=(0.11, 0.11, 0.11),
            z=3.04,
        )
        self.gun_base_z = self.gun.z
        self.muzzle_base_z = self.muzzle.z
        self.recoil_offset = 0.0
        self.recoil_velocity = 0.0
        self.cupola = Entity(
            parent=self.turret,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=turret_tint.tint(0.05),
            x=-0.36,
            y=0.36,
            z=-0.24,
            scale=(0.46, 0.24, 0.46),
        )
        self.commander_sight = Entity(
            parent=self.turret,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(62, 74, 82),
            x=0.44,
            y=0.34,
            z=-0.2,
            scale=(0.3, 0.18, 0.3),
        )
        self.turret_bustle = Entity(
            parent=self.turret,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=turret_tint.tint(-0.04),
            y=0.05,
            z=-1.35,
            scale=(1.6, 0.55, 0.82),
        )
        self.side_skirt_left = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=hull_tint.tint(0.03),
            x=-1.68,
            y=-0.08,
            scale=(0.12, 0.6, 4.8),
        )
        self.side_skirt_right = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=hull_tint.tint(0.03),
            x=1.68,
            y=-0.08,
            scale=(0.12, 0.6, 4.8),
        )
        self.glacis = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=hull_tint.tint(0.06),
            y=0.43,
            z=2.45,
            rotation=(21, 0, 0),
            scale=(2.75, 0.28, 0.82),
        )
        self.rear_deck = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=hull_tint.tint(-0.05),
            y=0.44,
            z=-2.1,
            scale=(2.6, 0.12, 1.3),
        )
        self.exhaust_left = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(78, 78, 74),
            x=-0.8,
            y=0.22,
            z=-2.82,
            scale=(0.24, 0.24, 0.22),
        )
        self.exhaust_right = Entity(
            parent=self,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(78, 78, 74),
            x=0.8,
            y=0.22,
            z=-2.82,
            scale=(0.24, 0.24, 0.22),
        )
        self.barrel_sleeve = Entity(
            parent=self.gun_pivot,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(88, 90, 94),
            scale=(0.38, 0.38, 0.38),
            z=0.65,
        )
        self.muzzle_brake = Entity(
            parent=self.gun_pivot,
            model="cube",
            texture="assets/textures/metal.ppm",
            color=color.rgb(78, 78, 82),
            scale=(0.24, 0.2, 0.28),
            z=2.85,
        )
        self._build_running_gear(hull_tint)

        # A small visual mast makes enemy vehicles easy to identify at range.
        if is_enemy:
            Entity(
                parent=self.turret,
                model="cube",
                texture="assets/textures/metal.ppm",
                color=color.red,
                y=0.63,
                z=-0.72,
                scale=(0.13, 0.5, 0.13),
            )

        for part in (
            self,
            self.turret,
            self.gun,
            self.muzzle,
            self.cupola,
            self.commander_sight,
            self.turret_bustle,
            self.side_skirt_left,
            self.side_skirt_right,
            self.glacis,
            self.rear_deck,
            self.exhaust_left,
            self.exhaust_right,
            self.barrel_sleeve,
            self.muzzle_brake,
        ):
            part.shader = lit_with_shadows_shader

        self.movement = TankMovementController(self, self.spec)
        self.turret_controller = TurretController(self, self.spec)
        self.damage_model = DamageModel(MODULE_LAYOUT)

        self.current_ammo_type = "AP"
        self.reload_timer = 0.0
        self.current_reload = AMMO_TYPES[self.current_ammo_type].reload_time

    def update_common(self):
        if self.reload_timer > 0:
            self.reload_timer = max(0.0, self.reload_timer - time.dt)

        if self.recoil_offset > 0.0 or self.recoil_velocity > 0.0:
            self.recoil_velocity -= 14.0 * time.dt
            self.recoil_offset = max(0.0, self.recoil_offset + self.recoil_velocity * time.dt)
            self.gun.z = self.gun_base_z - self.recoil_offset
            self.muzzle.z = self.muzzle_base_z - self.recoil_offset
        else:
            self.gun.z = self.gun_base_z
            self.muzzle.z = self.muzzle_base_z

    def cycle_ammo(self):
        self.current_ammo_type = "HE" if self.current_ammo_type == "AP" else "AP"
        self.current_reload = AMMO_TYPES[self.current_ammo_type].reload_time

    def try_fire(self, game):
        if self.reload_timer > 0 or self.damage_model.state.firepower_kill:
            return False

        ammo = AMMO_TYPES[self.current_ammo_type]
        shell_direction = self.gun.forward.normalized()
        Shell(
            owner_tank=self,
            ammo=ammo,
            position=self.muzzle.world_position + shell_direction * 0.2,
            direction=shell_direction,
            game=game,
        )
        self.reload_timer = ammo.reload_time
        self.current_reload = ammo.reload_time
        self.recoil_offset = 0.34
        self.recoil_velocity = 4.8
        self._spawn_muzzle_flash(shell_direction)
        return True

    def _build_running_gear(self, hull_tint):
        wheel_color = hull_tint.tint(-0.2)
        for side in (-1, 1):
            for idx, z in enumerate([-2.2, -1.3, -0.4, 0.5, 1.4, 2.3]):
                wheel = Entity(
                    parent=self,
                    model="cube",
                    texture="assets/textures/metal.ppm",
                    color=wheel_color,
                    x=side * 1.48,
                    y=-0.44,
                    z=z,
                    scale=(0.18, 0.56 if idx in (0, 5) else 0.52, 0.44),
                )
                wheel.shader = lit_with_shadows_shader

    def _spawn_muzzle_flash(self, shell_direction):
        flash = Entity(
            parent=scene,
            model="cube",
            color=color.rgba(255, 216, 128, 215),
            position=self.muzzle.world_position + shell_direction * 0.2,
            rotation=self.gun.world_rotation,
            scale=(0.16, 0.16, 0.16),
        )
        flash.shader = lit_with_shadows_shader
        flash.animate_scale((0.1, 0.1, 1.05), duration=0.06)
        flash.fade_out(duration=0.05)
        invoke(destroy, flash, delay=0.1)

        smoke = Entity(
            parent=scene,
            model="cube",
            color=color.rgba(170, 170, 170, 145),
            position=self.muzzle.world_position + shell_direction * 0.35,
            scale=0.22,
        )
        smoke.animate_position(smoke.position + shell_direction * 1.0 + Vec3(0, 0.45, 0), duration=0.35)
        smoke.animate_scale(0.75, duration=0.35)
        smoke.fade_out(duration=0.32)
        invoke(destroy, smoke, delay=0.38)

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
