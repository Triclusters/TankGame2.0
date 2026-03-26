from dataclasses import dataclass
from math import atan2, degrees

from ursina import clamp, mouse, time

from config import TankSpec


@dataclass
class TurretState:
    yaw_deg: float = 0.0
    pitch_deg: float = 0.0


class TurretController:
    def __init__(self, tank, spec: TankSpec):
        self.tank = tank
        self.spec = spec
        self.state = TurretState()
        self.zoomed = False
        self._yaw_synced = False

    def toggle_zoom(self):
        self.zoomed = not self.zoomed

    def update_player(self):
        self._sync_world_yaw_once()
        # Mouse x steers turret traverse, y controls gun elevation/depression.
        yaw_target_delta = mouse.velocity[0] * 170.0
        # Keep positive pitch = elevate, negative pitch = depress.
        pitch_target_delta = mouse.velocity[1] * 120.0

        max_yaw_step = self.spec.turret_turn_rate_deg * time.dt
        max_pitch_step = self.spec.gun_elevation_rate_deg * time.dt

        self.state.yaw_deg += clamp(yaw_target_delta, -max_yaw_step, max_yaw_step)
        self.state.pitch_deg += clamp(pitch_target_delta, -max_pitch_step, max_pitch_step)
        self.state.pitch_deg = clamp(
            self.state.pitch_deg,
            self.spec.gun_min_pitch_deg,
            self.spec.gun_max_pitch_deg,
        )

        self._apply_to_entities()

    def update_ai(self, world_target):
        self._sync_world_yaw_once()
        turret_world_pos = self.tank.turret.world_position
        to_target = world_target - turret_world_pos

        desired_world_yaw = degrees(atan2(to_target.x, to_target.z))
        yaw_error = (desired_world_yaw - self.tank.turret.world_y + 540) % 360 - 180
        yaw_step = clamp(yaw_error, -self.spec.turret_turn_rate_deg * time.dt, self.spec.turret_turn_rate_deg * time.dt)
        self.state.yaw_deg += yaw_step

        horiz_dist = max(0.001, (to_target.x**2 + to_target.z**2) ** 0.5)
        # Positive pitch elevates the gun, negative pitch depresses it.
        desired_pitch = degrees(atan2(to_target.y, horiz_dist))
        pitch_error = desired_pitch - self.state.pitch_deg
        pitch_step = clamp(pitch_error, -self.spec.gun_elevation_rate_deg * time.dt, self.spec.gun_elevation_rate_deg * time.dt)
        self.state.pitch_deg = clamp(
            self.state.pitch_deg + pitch_step,
            self.spec.gun_min_pitch_deg,
            self.spec.gun_max_pitch_deg,
        )

        self._apply_to_entities()
        return abs(yaw_error), abs(pitch_error)

    def _apply_to_entities(self):
        # Keep turret world yaw stable while hull rotates.
        self.tank.turret.rotation_y = self.state.yaw_deg - self.tank.rotation_y
        # Ursina's local X rotation is inverted for this pivot setup.
        self.tank.gun_pivot.rotation_x = -self.state.pitch_deg

    def _sync_world_yaw_once(self):
        if self._yaw_synced:
            return
        self.state.yaw_deg = self.tank.turret.world_y
        self._yaw_synced = True
