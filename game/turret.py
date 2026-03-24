from math import atan2, degrees
from ursina import mouse, time, clamp

class Turret:
    def __init__(self, tank, cfg):
        self.tank = tank
        self.cfg = cfg
        self.yaw = 0.0
        self.pitch = 0.0
        self.zoom = False

    def toggle_zoom(self):
        self.zoom = not self.zoom

    def player_update(self):
        dyaw = mouse.velocity[0] * 170
        dpitch = -mouse.velocity[1] * 120
        self.yaw += clamp(dyaw, -self.cfg["turret_turn"]*time.dt, self.cfg["turret_turn"]*time.dt)
        self.pitch += clamp(dpitch, -self.cfg["gun_pitch_rate"]*time.dt, self.cfg["gun_pitch_rate"]*time.dt)
        self.pitch = clamp(self.pitch, self.cfg["pitch_min"], self.cfg["pitch_max"])
        self.apply()

    def ai_update(self, target_pos):
        d = target_pos - self.tank.turret.world_position
        desired = degrees(atan2(d.x, d.z))
        err = (desired - self.tank.turret.world_y + 540) % 360 - 180
        self.yaw += clamp(err, -self.cfg["turret_turn"]*time.dt, self.cfg["turret_turn"]*time.dt)
        self.apply()
        return abs(err)

    def apply(self):
        self.tank.turret.rotation_y = self.yaw
        self.tank.gun_pivot.rotation_x = self.pitch