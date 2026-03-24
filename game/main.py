"""Compatibility entrypoint.

Running `python game/main.py` now boots the same game as `python main.py`.
"""

from __future__ import annotations

import sys
from pathlib import Path


# Ensure repository root (which contains the real implementation modules) is importable
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from main import TankGame  # noqa: E402


def run() -> None:
    game = TankGame()

    def update():
        game.update()

    def input(key):
        game.input(key)

    game.app.run()


if __name__ == "__main__":
    run()
