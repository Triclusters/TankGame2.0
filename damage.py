from dataclasses import dataclass, field
from typing import Dict, List
import random


@dataclass
class DamageState:
    modules_hp: Dict[str, float]
    dead_crew: int = 0
    destroyed: bool = False
    mobility_kill: bool = False
    firepower_kill: bool = False
    last_module_hit: str = "none"
    log: List[str] = field(default_factory=list)


class DamageModel:
    def __init__(self, module_layout):
        self.module_layout = module_layout
        self.state = DamageState(modules_hp={k: v[1].max_hp for k, v in module_layout.items()})

    def apply_non_penetration(self, he_power: float):
        # Spall/shock chance for tracks or optics-like systems (abstracted as tracks/gun_breech).
        if he_power > 80 and random.random() < 0.3:
            self._damage_module("tracks", 18)
        if he_power > 130 and random.random() < 0.22:
            self._damage_module("crew", 10)

    def apply_penetration(self, local_hit_point, shell_energy_factor: float):
        weighted = []
        for name, (mod_pos, spec) in self.module_layout.items():
            dx = local_hit_point.x - mod_pos[0]
            dy = local_hit_point.y - mod_pos[1]
            dz = local_hit_point.z - mod_pos[2]
            dist2 = dx * dx + dy * dy + dz * dz
            weighted.append((name, 1.0 / max(0.2, dist2)))

        total = sum(w for _, w in weighted)
        r = random.random() * total
        pick = weighted[-1][0]
        acc = 0.0
        for name, w in weighted:
            acc += w
            if r <= acc:
                pick = name
                break

        base = 52.0 * shell_energy_factor
        self._damage_module(pick, base)

        if pick == "ammo_rack" and random.random() < 0.32:
            self.state.destroyed = True
            self.state.log.append("Ammo rack detonation: catastrophic kill")

        self._update_kill_states()

    def _damage_module(self, module: str, dmg: float):
        if module not in self.state.modules_hp:
            return
        self.state.modules_hp[module] = max(0.0, self.state.modules_hp[module] - dmg)
        self.state.last_module_hit = module
        self.state.log.append(f"{module} damaged for {dmg:.1f}")

        if module == "crew" and random.random() < 0.5:
            self.state.dead_crew += 1

    def _update_kill_states(self):
        hp = self.state.modules_hp
        self.state.mobility_kill = hp["engine"] <= 0 or hp["transmission"] <= 0 or hp["tracks"] <= 0
        self.state.firepower_kill = hp["gun_breech"] <= 0 or hp["crew"] <= 10

        if self.state.dead_crew >= 3 or (self.state.mobility_kill and self.state.firepower_kill):
            self.state.destroyed = True

    def status_lines(self):
        hp = self.state.modules_hp
        return {
            "crew": f"Crew HP: {hp['crew']:.0f} / dead: {self.state.dead_crew}",
            "mobility": f"Engine {hp['engine']:.0f} | Trans {hp['transmission']:.0f} | Tracks {hp['tracks']:.0f}",
            "firepower": f"Breech {hp['gun_breech']:.0f} | Ammo {hp['ammo_rack']:.0f}",
            "kills": f"MobilityKill={self.state.mobility_kill} FirepowerKill={self.state.firepower_kill} Destroyed={self.state.destroyed}",
            "last": f"Last module hit: {self.state.last_module_hit}",
        }
