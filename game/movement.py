from ursina import held_keys, time, clamp

class Movement:
    def __init__(self, tank, cfg):
        self.tank = tank
        self.cfg = cfg
        self.speed = 0.0
        self.target = 0.0

    def player_update(self):
        t = (1 if held_keys["w"] else 0) - (1 if held_keys["s"] else 0)
        if t > 0: self.target = self.cfg["max_fwd"] * t
        elif t < 0: self.target = -self.cfg["max_rev"] * abs(t)
        else: self.target = 0.0
        self._step(held_keys["d"] - held_keys["a"])

    def ai_update(self, throttle, steer):
        self.target = throttle * (self.cfg["max_fwd"] if throttle >= 0 else self.cfg["max_rev"])
        self._step(steer)

    def _step(self, steer):
        rate = self.cfg["accel"] if abs(self.target) > abs(self.speed) else self.cfg["brake"]
        dt = time.dt
        if self.speed < self.target: self.speed = min(self.speed + rate * dt, self.target)
        elif self.speed > self.target: self.speed = max(self.speed - rate * dt, self.target)
        self.speed = clamp(self.speed, -self.cfg["max_rev"], self.cfg["max_fwd"])
        turn_scale = max(0.25, 1.0 - abs(self.speed)/max(0.1, self.cfg["max_fwd"]))
        self.tank.rotation_y += steer * self.cfg["hull_turn"] * turn_scale * dt
        self.tank.position += self.tank.forward * self.speed * dt