from dataclasses import dataclass

from ursina import clamp, held_keys, time

from config import TankSpec


@dataclass
class MovementState:
    speed: float = 0.0
    desired_speed: float = 0.0


class TankMovementController:
    def __init__(self, tank, spec: TankSpec):
        self.tank = tank
        self.spec = spec
        self.state = MovementState()

    def update_player(self):
        throttle = 0.0
        if held_keys["w"]:
            throttle += 1.0
        if held_keys["s"]:
            throttle -= 1.0

        if throttle > 0:
            self.state.desired_speed = self.spec.max_forward_speed * throttle
        elif throttle < 0:
            self.state.desired_speed = self.spec.max_reverse_speed * throttle
        else:
            self.state.desired_speed = 0.0

        self._apply_longitudinal_dynamics()
        self._apply_hull_turning(held_keys["d"] - held_keys["a"])
        self._apply_motion()

    def update_ai(self, throttle: float, steer: float):
        self.state.desired_speed = throttle * (
            self.spec.max_forward_speed if throttle >= 0 else self.spec.max_reverse_speed
        )
        self._apply_longitudinal_dynamics()
        self._apply_hull_turning(steer)
        self._apply_motion()

    def _apply_longitudinal_dynamics(self):
        dt = time.dt
        accelerating = abs(self.state.desired_speed) > abs(self.state.speed)
        rate = self.spec.acceleration if accelerating else self.spec.braking

        if self.state.speed < self.state.desired_speed:
            self.state.speed = min(self.state.speed + rate * dt, self.state.desired_speed)
        elif self.state.speed > self.state.desired_speed:
            self.state.speed = max(self.state.speed - rate * dt, self.state.desired_speed)

        self.state.speed = clamp(self.state.speed, -self.spec.max_reverse_speed, self.spec.max_forward_speed)

    def _apply_hull_turning(self, steer_input: float):
        steer_scale = max(0.25, 1.0 - abs(self.state.speed) / self.spec.max_forward_speed)
        yaw_delta = steer_input * self.spec.hull_turn_rate_deg * steer_scale * time.dt
        self.tank.rotation_y += yaw_delta

    def _apply_motion(self):
        self.tank.position += self.tank.forward * self.state.speed * time.dt
        # Basic ground adaptation: keep hull planted while preserving local tilt from terrain function.
        self.tank.y = self.tank.sample_terrain_height(self.tank.x, self.tank.z)
