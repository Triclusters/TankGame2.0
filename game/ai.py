from math import atan2, degrees
from ursina import time

class EnemyAI:
    def __init__(self, me, target, game):
        self.me = me
        self.target = target
        self.game = game
        self.cool = 0.0

    def update(self):
        if self.me.damage.destroyed: return
        self.cool = max(0.0, self.cool - time.dt)

        d = self.target.world_position - self.me.world_position
        dist = d.length()
        if dist > self.me.cfg["detect_range"]:
            self.me.move.ai_update(0, 0.25)
            return

        desired = degrees(atan2(d.x, d.z))
        err = (desired - self.me.rotation_y + 540) % 360 - 180
        steer = max(-1, min(1, err / 30))
        throttle = 0.6 if abs(err) < 20 and dist > 75 else 0
        if self.me.damage.mobility_kill: throttle, steer = 0, 0

        self.me.move.ai_update(throttle, steer)
        yaw_err = self.me.turret_ctrl.ai_update(self.target.turret.world_position)
        if yaw_err < 2.5 and self.cool <= 0 and not self.me.damage.firepower_kill:
            if self.me.try_fire(self.game):
                self.cool = self.me.reload