import random
from config import MODULE_HP

class DamageModel:
    def __init__(self):
        self.hp = dict(MODULE_HP)
        self.dead_crew = 0
        self.last_module = "none"
        self.destroyed = False
        self.mobility_kill = False
        self.firepower_kill = False

    def apply_non_pen(self, he_power):
        if he_power > 80 and random.random() < 0.2:
            self._hit("tracks", 15)

    def apply_pen(self):
        mod = random.choice(list(self.hp.keys()))
        self._hit(mod, 35 + random.random() * 20)

        if mod == "ammo_rack" and random.random() < 0.25:
            self.destroyed = True

        self.mobility_kill = self.hp["engine"] <= 0 or self.hp["transmission"] <= 0 or self.hp["tracks"] <= 0
        self.firepower_kill = self.hp["gun_breech"] <= 0 or self.hp["crew"] <= 10
        if self.dead_crew >= 3 or (self.mobility_kill and self.firepower_kill):
            self.destroyed = True

    def _hit(self, name, dmg):
        self.hp[name] = max(0.0, self.hp[name] - dmg)
        self.last_module = name
        if name == "crew" and random.random() < 0.5:
            self.dead_crew += 1

    def status(self):
        return (
            f"Crew {self.hp['crew']:.0f} dead:{self.dead_crew}\n"
            f"Engine {self.hp['engine']:.0f} Trans {self.hp['transmission']:.0f} Tracks {self.hp['tracks']:.0f}\n"
            f"Breech {self.hp['gun_breech']:.0f} Ammo {self.hp['ammo_rack']:.0f}\n"
            f"MobKill={self.mobility_kill} FireKill={self.firepower_kill} Destroyed={self.destroyed}\n"
            f"Last module: {self.last_module}"
        )