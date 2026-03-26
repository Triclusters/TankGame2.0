from ursina import (
    AmbientLight,
    DirectionalLight,
    Ursina,
    EditorCamera,
    Entity,
    Quad,
    Sky,
    Text,
    Vec3,
    application,
    camera,
    color,
    held_keys,
    lerp,
    lit_with_shadows_shader,
    mouse,
    scene,
    time,
)

from ai import EnemyAIController
from config import BATTLEFIELD_SIZE
from hud import TankHUD
from projectile import ProjectileDebug
from tank import Tank


class TankGame:
    def __init__(self):
        self.app = Ursina(borderless=False)
        window_text = Text("Tank Simulator Prototype", y=0.48, x=-0.1)
        window_text.parent = application.base.cam2dp

        self._build_environment()

        self.player = Tank(position=Vec3(-20, 0, -20), tint=color.rgb(110, 140, 115), name="player")
        self.enemy = Tank(position=Vec3(45, 0, 35), tint=color.rgb(145, 110, 100), name="enemy")
        self.enemy.rotation_y = 210

        self.tanks = [self.player, self.enemy]
        self.debug_state = ProjectileDebug(note="no impacts yet")

        self.ai = EnemyAIController(self.enemy, self.player, self)
        self.hud = TankHUD(self)

        self.camera_rig = EditorCamera(enabled=False)
        mouse.locked = True

        self.phase_summary_printed = False
        self._last_key_state = {}

    def _build_environment(self):
        ground = Entity(
            model="plane",
            scale=(BATTLEFIELD_SIZE, 1, BATTLEFIELD_SIZE),
            texture="assets/textures/ground.ppm",
            texture_scale=(BATTLEFIELD_SIZE / 7, BATTLEFIELD_SIZE / 7),
            color=color.rgb(108, 120, 92),
            collider=None,
        )
        ground.shader = lit_with_shadows_shader

        Sky(texture="sky_default", color=color.rgb(160, 190, 225))
        sun = DirectionalLight(parent=scene, y=30, z=-20, rotation=(45, -35, 0))
        sun.color = color.rgba(255, 242, 214, 0.86)
        AmbientLight(parent=scene, color=color.rgba(168, 182, 194, 0.35))

        # Simple hill and cover placeholders.
        for x, z, sx, sy, sz in [
            (-35, 10, 18, 4, 16),
            (10, -25, 12, 3, 10),
            (30, 20, 9, 5, 9),
            (-5, 35, 22, 3, 8),
        ]:
            hill = Entity(
                model="cube",
                texture="assets/textures/rock.ppm",
                color=color.rgb(106, 114, 88),
                position=(x, sy / 2, z),
                scale=(sx, sy, sz),
            )
            hill.shader = lit_with_shadows_shader

        for x, z in [(-12, -5), (6, 12), (20, -10), (-25, 28), (36, 8)]:
            cover = Entity(
                model="cube",
                texture="assets/textures/rock.ppm",
                color=color.rgb(118, 118, 124),
                position=(x, 1.5, z),
                scale=(2.5, 3.0, 2.5),
            )
            cover.shader = lit_with_shadows_shader

        # Background silhouettes to give the battlefield depth.
        for x, z, ry, sx, sy in [
            (-65, -55, 12, 70, 18),
            (60, -50, -8, 60, 15),
            (-58, 52, -5, 65, 20),
            (58, 55, 7, 70, 16),
        ]:
            Entity(
                model=Quad(mode="ngon", segments=2, thickness=1),
                position=(x, sy / 2, z),
                rotation=(0, ry, 0),
                scale=(sx, sy),
                color=color.rgba(90, 120, 95, 220),
                double_sided=True,
            )

    def update(self):
        self._print_phase_summaries_once()
        self._handle_discrete_inputs()

        if held_keys["escape"]:
            mouse.locked = False

        if held_keys["left mouse"]:
            self.player.try_fire(self)

        self.player.update_common()
        self.enemy.update_common()

        if not self.player.damage_model.state.destroyed and not self.player.damage_model.state.mobility_kill:
            self.player.movement.update_player()
        if not self.player.damage_model.state.destroyed:
            self.player.turret_controller.update_player()

        self.ai.update()

        self._update_camera()
        self.hud.update()

    def _update_camera(self):
        pivot = self.player.turret.world_position + Vec3(0, 1.3, 0)
        back = -self.player.turret.forward * (3.6 if self.player.turret_controller.zoomed else 8.5)
        up = Vec3(0, 1.2 if self.player.turret_controller.zoomed else 3.2, 0)

        camera.world_position = lerp(camera.world_position, pivot + back + up, min(1, time.dt * 10))
        camera.look_at(self.player.muzzle.world_position + self.player.turret.forward * 25)

    def _pressed(self, key: str) -> bool:
        down = bool(held_keys[key])
        previous = self._last_key_state.get(key, False)
        self._last_key_state[key] = down
        return down and not previous

    def _handle_discrete_inputs(self):
        # Keep key-bind actions responsive even when the engine-level input callback
        # is skipped (for example due to focus hiccups in some environments).
        if self._pressed("v"):
            self.player.turret_controller.toggle_zoom()
        if self._pressed("r"):
            self.restart()
        if self._pressed("1"):
            self.player.current_ammo_type = "AP"
        if self._pressed("2"):
            self.player.current_ammo_type = "HE"
        if self._pressed("tab"):
            self.player.cycle_ammo()

    def input(self, key):
        if key == "left mouse down":
            self.player.try_fire(self)
        elif key == "v":
            self.player.turret_controller.toggle_zoom()
        elif key == "r":
            self.restart()
        elif key == "1":
            self.player.current_ammo_type = "AP"
        elif key == "2":
            self.player.current_ammo_type = "HE"
        elif key == "tab":
            self.player.cycle_ammo()

    def restart(self):
        for e in list(self.app.entities):
            if e.__class__.__name__ == "Shell":
                e.disable()
        self.player.position = Vec3(-20, 0, -20)
        self.enemy.position = Vec3(45, 0, 35)
        self.player.rotation = Vec3(0, 0, 0)
        self.enemy.rotation = Vec3(0, 210, 0)

        self.player.damage_model = self.player.damage_model.__class__(self.player.damage_model.module_layout)
        self.enemy.damage_model = self.enemy.damage_model.__class__(self.enemy.damage_model.module_layout)
        self.player.reload_timer = 0
        self.enemy.reload_timer = 0

        self.debug_state = ProjectileDebug(note="restarted")

    def _print_phase_summaries_once(self):
        if self.phase_summary_printed:
            return
        self.phase_summary_printed = True
        print("[Phase 1] Working: 3D map, player movement, turret control, shell firing, third-person camera.")
        print("[Phase 1] Remaining: armor, penetration, internal damage, AI, HUD diagnostics.")
        print("[Phase 2] Working: armor zones, impact-angle effective thickness, AP/HE ammo, penetration + ricochet, module damage.")
        print("[Phase 2] Remaining: AI behavior integration and player-facing debug/status UI polish.")
        print("[Phase 3] Working: enemy AI engage/fire loop, damage state outcomes, HUD/debug panel, restart.")
        print("[Phase 3] Remaining: balancing/tuning and richer map/vehicle variations.")


if __name__ == "__main__":
    game = TankGame()

    def update():
        game.update()

    def input(key):
        game.input(key)

    game.app.run()
