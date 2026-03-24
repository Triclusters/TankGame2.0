from ursina import Entity, Text, camera, color, time

from config import DEBUG_FONT_SCALE


class TankHUD:
    def __init__(self, game):
        self.game = game

        self.panel = Entity(
            parent=camera.ui,
            model="quad",
            position=(-0.72, 0.32),
            scale=(0.55, 0.34),
            color=color.rgba(15, 20, 18, 175),
        )

        self.reticle = Text(text="+", origin=(0, 0), scale=2.0, color=color.red)
        self.reticle.parent = camera.ui
        self.reticle.position = (0, 0)

        self.ammo_text = Text(parent=camera.ui, x=-0.94, y=0.45, scale=1.1, color=color.cyan)
        self.reload_text = Text(parent=camera.ui, x=-0.94, y=0.40, scale=1.0, color=color.azure)
        self.speed_text = Text(parent=camera.ui, x=-0.94, y=0.35, scale=1.0, color=color.lime)
        self.damage_text = Text(parent=camera.ui, x=-0.94, y=0.28, scale=0.9, color=color.white)

        self.debug_text = Text(
            parent=camera.ui,
            x=-0.87,
            y=-0.34,
            scale=DEBUG_FONT_SCALE * 1.15,
            color=color.rgb(210, 235, 255),
            background=True,
        )
        self.debug_backdrop = Entity(
            parent=camera.ui,
            model="quad",
            position=(-0.53, -0.35),
            scale=(0.94, 0.21),
            color=color.rgba(10, 14, 16, 175),
        )
        self.debug_text.z = -0.1

        self.banner = Text(parent=camera.ui, origin=(0, 0), y=0.35, scale=1.4, color=color.orange)

    def update(self):
        player = self.game.player
        self.ammo_text.text = f"Ammo: {player.current_ammo_type}  (1=AP  2=HE  Tab=cycle)"

        if player.reload_timer > 0:
            self.reload_text.text = f"Reload: {player.reload_timer:.1f}s"
        else:
            self.reload_text.text = "Reload: READY"
        self.speed_text.text = f"Speed: {player.movement.state.speed:.1f} m/s"

        status = player.damage_model.status_lines()
        self.damage_text.text = (
            f"{status['crew']}\n{status['mobility']}\n{status['firepower']}\n{status['kills']}"
        )

        dbg = self.game.debug_state
        self.debug_text.text = (
            f"Debug:\n"
            f"v={dbg.velocity:.1f} m/s angle={dbg.impact_angle_deg:.1f} zone={dbg.armor_zone}\n"
            f"eff={dbg.effective_armor:.1f}mm result={dbg.note} module={dbg.module_hit}\n"
            f"last_update={time.time():.1f}"
        )

        self.banner.text = ""
        if self.game.player.damage_model.state.destroyed:
            self.banner.text = "PLAYER DESTROYED - Press R to Restart"
        elif self.game.enemy.damage_model.state.destroyed:
            self.banner.text = "TARGET DESTROYED - Press R to Restart"
