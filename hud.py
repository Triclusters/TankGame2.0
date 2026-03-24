from ursina import Text, camera, color, time

from config import DEBUG_FONT_SCALE


class TankHUD:
    def __init__(self, game):
        self.game = game

        self.reticle = Text(text="+", origin=(0, 0), scale=2.0, color=color.red)
        self.reticle.parent = camera.ui
        self.reticle.position = (0, 0)

        self.ammo_text = Text(parent=camera.ui, x=-0.86, y=0.45, scale=1.1)
        self.reload_text = Text(parent=camera.ui, x=-0.86, y=0.40, scale=1.0)
        self.damage_text = Text(parent=camera.ui, x=-0.86, y=0.33, scale=0.9)

        self.debug_text = Text(
            parent=camera.ui,
            x=-0.86,
            y=-0.45,
            scale=DEBUG_FONT_SCALE,
            color=color.azure,
        )

        self.banner = Text(parent=camera.ui, origin=(0, 0), y=0.35, scale=1.4, color=color.orange)

    def update(self):
        player = self.game.player
        self.ammo_text.text = f"Ammo: {player.current_ammo_type}"

        if player.reload_timer > 0:
            self.reload_text.text = f"Reload: {player.reload_timer:.1f}s"
        else:
            self.reload_text.text = "Reload: READY"

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
