from ursina import Ursina, Entity, Sky, Vec3, color, held_keys, mouse, time

from tank import Tank
from ai import EnemyAI
from hud import HUD

class Game:
    def __init__(self):
        self.app = Ursina()
        self.debug = "no impacts yet"

        Entity(model="plane", scale=(260,1,260), color=color.rgb(72,98,66))
        Sky(color=color.rgb(110,140,180))

        for x,z,sx,sy,sz in [(-35,10,18,4,16),(10,-25,12,3,10),(30,20,9,5,9),(-5,35,22,3,8)]:
            Entity(model="cube", color=color.rgb(80,110,70), position=(x,sy/2,z), scale=(sx,sy,sz))

        self.player = Tank(pos=Vec3(-20,0,-20), tint=color.rgb(110,140,115))
        self.enemy = Tank(pos=Vec3(45,0,35), tint=color.rgb(145,110,100))
        self.enemy.rotation_y = 210
        self.tanks = [self.player, self.enemy]

        self.ai = EnemyAI(self.enemy, self.player, self)
        self.hud = HUD(self)
        mouse.locked = True

    def update(self):
        if held_keys["left mouse"]:
            self.player.try_fire(self)

        if held_keys["1"]: self.player.ammo_type = "AP"
        if held_keys["2"]: self.player.ammo_type = "HE"

        self.player.tick(); self.enemy.tick()

        if not self.player.damage.destroyed and not self.player.damage.mobility_kill:
            self.player.move.player_update()
        if not self.player.damage.destroyed:
            self.player.turret_ctrl.player_update()

        self.ai.update()
        self.hud.update()
        self._camera()

    def _camera(self):
        cam = self.app.camera
        pivot = self.player.turret.world_position + Vec3(0,1.3,0)
        back = -self.player.turret.forward * (3.6 if self.player.turret_ctrl.zoom else 8.5)
        up = Vec3(0,1.2 if self.player.turret_ctrl.zoom else 3.2,0)
        cam.position = cam.position.lerp(pivot + back + up, min(1, time.dt*10))
        cam.look_at(self.player.muzzle.world_position + self.player.turret.forward*25)

    def input(self, key):
        if key == "v": self.player.turret_ctrl.toggle_zoom()
        if key == "r":
            self.player.position = Vec3(-20,0,-20)
            self.enemy.position = Vec3(45,0,35)
            self.player.damage = self.player.damage.__class__()
            self.enemy.damage = self.enemy.damage.__class__()
            self.debug = "restarted"

if __name__ == "__main__":
    g = Game()
    def update(): g.update()
    def input(key): g.input(key)
    g.app.run()