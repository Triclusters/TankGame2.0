from ursina import Text, camera, color

class HUD:
    def __init__(self, game):
        self.game = game
        self.cross = Text("+", parent=camera.ui, origin=(0,0), scale=2, color=color.red)
        self.ammo = Text(parent=camera.ui, x=-.86, y=.45)
        self.reload = Text(parent=camera.ui, x=-.86, y=.40)
        self.status = Text(parent=camera.ui, x=-.86, y=.33, scale=.9)
        self.debug = Text(parent=camera.ui, x=-.86, y=-.45, scale=.85, color=color.azure)
        self.banner = Text(parent=camera.ui, y=.35, origin=(0,0), scale=1.4, color=color.orange)

    def update(self):
        p = self.game.player
        self.ammo.text = f"Ammo: {p.ammo_type}"
        self.reload.text = f"Reload: {p.reload_timer:.1f}s" if p.reload_timer > 0 else "Reload: READY"
        self.status.text = p.damage.status()
        self.debug.text = "Debug:\n" + self.game.debug
        self.banner.text = ""
        if p.damage.destroyed: self.banner.text = "PLAYER DESTROYED - R to restart"
        elif self.game.enemy.damage.destroyed: self.banner.text = "TARGET DESTROYED - R to restart"