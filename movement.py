from dataclasses import dataclass

from ursina import clamp, held_keys, time

from config import TankSpec


@dataclass
class MovementState:
    speed: float = 0.0
    desired_speed: float = 0.0
    steer_axis: float = 0.0


class TankMovementController:
    def __init__(self, tank, spec: TankSpec):
        self.tank = tank
        self.spec = spec
        self.state = MovementState()

    def update_player(self):
        throttle = 0.0
        if held_keys["w"] or held_keys["up arrow"]:
            throttle += 1.0
        if held_keys["s"] or held_keys["down arrow"]:
            throttle -= 1.0

        if throttle > 0:
            self.state.desired_speed = self.spec.max_forward_speed * throttle
        elif throttle < 0:
            self.state.desired_speed = self.spec.max_reverse_speed * throttle
        else:
            self.state.desired_speed = 0.0

        self._apply_longitudinal_dynamics()
        steer_right = held_keys["d"] or held_keys["right arrow"]
        steer_left = held_keys["a"] or held_keys["left arrow"]
        self._apply_hull_turning(steer_right - steer_left)
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
        dt = time.dt
        steer_input = clamp(steer_input, -1.0, 1.0)

        # War Thunder-style feel: steering input builds slightly over time rather than
        # snapping instantly, making track transitions feel heavier.
        steer_response = 4.8
        self.state.steer_axis += (steer_input - self.state.steer_axis) * min(1.0, steer_response * dt)

        speed_abs = abs(self.state.speed)
        speed_ratio = min(1.0, speed_abs / max(0.1, self.spec.max_forward_speed))
        is_neutral_turn = speed_abs < 0.75 and abs(self.state.desired_speed) < 0.3

        if is_neutral_turn:
            # Neutral steer/pivot turn when nearly stopped.
            yaw_rate = self.spec.hull_turn_rate_deg * 0.72
            yaw_delta = self.state.steer_axis * yaw_rate * dt
        else:
            # As speed rises, available turn authority reduces and reverses invert steer feel.
            steer_scale = max(0.26, 1.08 - speed_ratio * 0.72)
            reverse_modifier = -1.0 if self.state.speed < -0.2 else 1.0
            yaw_delta = (
                self.state.steer_axis
                * reverse_modifier
                * self.spec.hull_turn_rate_deg
                * steer_scale
                * dt
            )

            # Hard turning at speed bleeds velocity from track scrub, matching heavier hull behavior.
            turn_drag = abs(self.state.steer_axis) * speed_ratio * 1.6 * dt
            self.state.speed *= max(0.0, 1.0 - turn_drag)

        self.tank.rotation_y += yaw_delta

    def _apply_motion(self):
        self.tank.position += self.tank.forward * self.state.speed * time.dt
        # Basic ground adaptation: keep hull planted while preserving local tilt from terrain function.
        self.tank.y = self.tank.sample_terrain_height(self.tank.x, self.tank.z)
