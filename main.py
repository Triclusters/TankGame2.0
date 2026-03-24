from ursina import (
    Ursina,
    EditorCamera,
    Entity,
    Sky,
    Text,
    Vec3,
    application,
    color,
    held_keys,
    mouse,
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

    def _build_environment(self):
        Entity(
            model="plane",
            scale=(BATTLEFIELD_SIZE, 1, BATTLEFIELD_SIZE),
            texture=None,
            color=color.rgb(72, 98, 66),
            collider=None,
        )
        Sky(color=color.rgb(110, 140, 180))

        # Simple hill and cover placeholders.
        for x, z, sx, sy, sz in [
            (-35, 10, 18, 4, 16),
            (10, -25, 12, 3, 10),
            (30, 20, 9, 5, 9),
            (-5, 35, 22, 3, 8),
        ]:
            Entity(model="cube", color=color.rgb(80, 110, 70), position=(x, sy / 2, z), scale=(sx, sy, sz))

        for x, z in [(-12, -5), (6, 12), (20, -10), (-25, 28), (36, 8)]:
            Entity(model="cube", color=color.gray, position=(x, 1.5, z), scale=(2.5, 3.0, 2.5))

    def update(self):
        self._print_phase_summaries_once()

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

        camera = self.app.camera
        camera.position = camera.position.lerp(pivot + back + up, min(1, time.dt * 10))
        camera.look_at(self.player.muzzle.world_position + self.player.turret.forward * 25)

    def input(self, key):
        if key == "v":
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
