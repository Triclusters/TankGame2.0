from ursina import time


class EnemyAIController:
    def __init__(self, tank, target_tank, game):
        self.tank = tank
        self.target = target_tank
        self.game = game
        self.fire_cooldown = 0.0

    def update(self):
        if self.tank.damage_model.state.destroyed:
            return

        self.fire_cooldown = max(0.0, self.fire_cooldown - time.dt)

        to_target = self.target.world_position - self.tank.world_position
        distance = to_target.length()
        if distance > self.tank.spec.detection_range:
            self.tank.movement.update_ai(throttle=0.0, steer=0.25)
            return

        desired_yaw = __import__("math").degrees(__import__("math").atan2(to_target.x, to_target.z))
        hull_yaw = self.tank.rotation_y
        yaw_error = (desired_yaw - hull_yaw + 540) % 360 - 180

        steer = max(-1.0, min(1.0, yaw_error / 30.0))
        throttle = 0.6 if abs(yaw_error) < 20 and distance > 75 else 0.0

        if self.tank.damage_model.state.mobility_kill:
            throttle = 0.0
            steer = 0.0

        self.tank.movement.update_ai(throttle=throttle, steer=steer)

        yaw_err, pitch_err = self.tank.turret_controller.update_ai(self.target.turret.world_position)
        aligned = yaw_err < self.tank.spec.fire_align_tolerance_deg and pitch_err < 3.0

        if aligned and self.fire_cooldown <= 0 and not self.tank.damage_model.state.firepower_kill:
            fired = self.tank.try_fire(self.game)
            if fired:
                self.fire_cooldown = self.tank.current_reload
