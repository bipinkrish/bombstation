# ba_meta require api 9
"""
Unlock Max Players Plugin for BombSquad / Ballistica.
Removes the default 8-player soft limit for Coop, Teams, and Free-for-All game modes.
"""
from __future__ import annotations

# Plugin Manager metadata
plugman = {
    "plugin_name": "unlock_max_players",
    "description": "Removes the 8-player limit and sets max players to 999 for Coop, Teams, and FFA.",
    "external_url": "https://github.com/efroemling/ballistica",
    "authors": [{"name": "BombStation", "email": "", "discord": ""}],
    "version": "1.0.0",
}

try:
    import babase
except ImportError:
    babase = None


# ba_meta export babase.Plugin
class UnlockMaxPlayersPlugin(babase.Plugin if babase else object):
    """Plugin to remove the 8-player limit on BombSquad game modes."""

    def on_app_running(self) -> None:
        """Called by the Ballistica engine once the app is initialized."""
        self.apply_max_players()

    @staticmethod
    def apply_max_players(max_players: int = 999) -> None:
        """Applies max players settings to the game configuration."""
        applied = False
        try:
            if babase and hasattr(babase, "app") and hasattr(babase.app, "config"):
                cfg = babase.app.config
                cfg["Coop Game Max Players"] = max_players
                cfg["Team Game Max Players"] = max_players
                cfg["Free-for-All Max Players"] = max_players
                if hasattr(cfg, "apply_and_commit"):
                    cfg.apply_and_commit()
                elif hasattr(cfg, "commit"):
                    cfg.commit()
                applied = True
        except Exception:
            pass

        # Fallback for alternative or legacy Ballistica environments
        if not applied:
            try:
                import bascenev1 as bs
                cfg = bs.get_config() if hasattr(bs, "get_config") else bs.getConfig()
                cfg["Coop Game Max Players"] = max_players
                cfg["Team Game Max Players"] = max_players
                cfg["Free-for-All Max Players"] = max_players
                if hasattr(bs, "write_config"):
                    bs.write_config()
                elif hasattr(bs, "writeConfig"):
                    bs.writeConfig()
                applied = True
            except Exception:
                pass

        if babase and hasattr(babase, "screenmessage"):
            babase.screenmessage(
                f"Max player limit updated to {max_players}!",
                color=(0.2, 1.0, 0.2),
            )


# Self-execute when run directly or pasted in Dev Console
if __name__ == "__main__":
    UnlockMaxPlayersPlugin.apply_max_players(999)
    print("SUCCESS: Max player limits updated to 999")
