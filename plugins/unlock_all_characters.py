# ba_meta require api 9
"""
Unlock All Characters Plugin for BombSquad / Ballistica.
Dynamically discovers and unlocks all character appearances (built-in and modded)
for local/custom games, character profile editing, and lobby selection.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

# Plugin Manager metadata
plugman = {
    "plugin_name": "unlock_all_characters",
    "description": "Dynamically unlocks all characters for local/custom games and profile creation.",
    "external_url": "https://github.com/efroemling/ballistica",
    "authors": [{"name": "BombStation", "email": "", "discord": ""}],
    "version": "1.1.0",
}

try:
    import babase
except ImportError:
    babase = None

try:
    import bascenev1 as bs
except ImportError:
    bs = None

_original_get_appearances = None
_original_getplayercharacters = None


def get_all_registered_appearances() -> list[str]:
    """Dynamically query all character appearances registered in the active engine."""
    # 1. Query modern Ballistica classic subsystem (API 8 / 9)
    try:
        classic = getattr(getattr(babase, "app", None), "classic", None)
        if classic and hasattr(classic, "spaz_appearances") and classic.spaz_appearances:
            return list(classic.spaz_appearances.keys())
    except Exception:
        pass

    # 2. Query bascenev1 classic subsystem
    try:
        if bs and hasattr(bs, "app") and hasattr(bs.app, "classic"):
            classic = bs.app.classic
            if classic and hasattr(classic, "spaz_appearances") and classic.spaz_appearances:
                return list(classic.spaz_appearances.keys())
    except Exception:
        pass

    # 3. Query legacy engine instance (API 7)
    try:
        import _ba

        if hasattr(_ba, "app") and hasattr(_ba.app, "spaz_appearances") and _ba.app.spaz_appearances:
            return list(_ba.app.spaz_appearances.keys())
    except Exception:
        pass

    # 4. Invoke original get_appearances with include_locked=True
    global _original_get_appearances
    if _original_get_appearances is not None:
        try:
            return _original_get_appearances(include_locked=True)
        except Exception:
            pass

    return []


def get_all_character_purchase_keys() -> set[str]:
    """Dynamically discover character store keys from the game's store registry."""
    purchase_keys: set[str] = set()

    # Query store items from classic.store
    try:
        classic = getattr(getattr(babase, "app", None), "classic", None)
        if classic and hasattr(classic, "store"):
            store_items = classic.store.get_store_items()
            for key in store_items.keys():
                if key.startswith("characters."):
                    purchase_keys.add(key)
    except Exception:
        pass

    # Generate synthetic keys for all known appearances to ensure coverage
    for name in get_all_registered_appearances():
        clean_name = name.lower().replace(" ", "").replace("-", "").replace("_", "")
        purchase_keys.add(f"characters.{clean_name}")

    return purchase_keys


def _unlocked_get_appearances(
    include_locked: bool = True,
    purchases: Any = None,
) -> list[str]:
    """Dynamically return all registered character appearances without hardcoding."""
    chars = get_all_registered_appearances()
    if chars:
        return chars

    # Fallback to original implementation forcing include_locked=True
    global _original_get_appearances
    if _original_get_appearances is not None:
        try:
            return _original_get_appearances(include_locked=True, purchases=purchases)
        except Exception:
            pass

    return ["Spaz"]


def _get_all_characters(session: Any = None, team: Any = None) -> list[str]:
    """Dynamically return all character names regardless of unlock status."""
    return _unlocked_get_appearances(include_locked=True)


# ba_meta export babase.Plugin
class UnlockAllCharactersPlugin(babase.Plugin if babase else object):
    """Plugin to unlock all characters dynamically in BombSquad for local/custom play."""

    def on_app_running(self) -> None:
        """Called by the Ballistica engine once the app is initialized."""
        self.apply_unlock()

    @classmethod
    def apply_unlock(cls) -> bool:
        """Hooks engine character methods to dynamically unlock all characters."""
        global _original_get_appearances, _original_getplayercharacters
        applied = False

        # 1. Hook bascenev1lib.actor.spazappearance (API 9 / Modern Ballistica)
        try:
            from bascenev1lib.actor import spazappearance

            if _original_get_appearances is None and hasattr(
                spazappearance, "get_appearances"
            ):
                _original_get_appearances = spazappearance.get_appearances
            spazappearance.get_appearances = _unlocked_get_appearances
            applied = True
        except Exception:
            pass

        # 2. Hook bastd.actor.spazappearance (API 7/8 / Legacy Ballistica)
        try:
            from bastd.actor import spazappearance as bastd_spazappearance

            if _original_get_appearances is None and hasattr(
                bastd_spazappearance, "get_appearances"
            ):
                _original_get_appearances = bastd_spazappearance.get_appearances
            bastd_spazappearance.get_appearances = _unlocked_get_appearances
            applied = True
        except Exception:
            pass

        # 3. Hook sys.modules if modules are already imported in memory
        try:
            import sys

            # UI Character Picker
            if "bauiv1lib.characterpicker" in sys.modules:
                picker_mod = sys.modules["bauiv1lib.characterpicker"]
                if hasattr(picker_mod, "spazappearance"):
                    picker_mod.spazappearance.get_appearances = _unlocked_get_appearances

            # Lobby chooser
            if "bascenev1._lobby" in sys.modules:
                lobby_mod = sys.modules["bascenev1._lobby"]
                if hasattr(lobby_mod, "get_appearances"):
                    lobby_mod.get_appearances = _unlocked_get_appearances
        except Exception:
            pass

        # 4. Attach bs.getplayercharacters / bascenev1.getplayercharacters
        try:
            import bascenev1

            if _original_getplayercharacters is None and hasattr(
                bascenev1, "getplayercharacters"
            ):
                _original_getplayercharacters = getattr(
                    bascenev1, "getplayercharacters"
                )
            bascenev1.getplayercharacters = _get_all_characters
            applied = True
        except Exception:
            pass

        try:
            import bs as legacy_bs

            legacy_bs.getplayercharacters = _get_all_characters
            applied = True
        except Exception:
            pass

        # 5. Dynamically augment local purchases set
        try:
            if babase and hasattr(babase, "app") and hasattr(babase.app, "classic"):
                classic = babase.app.classic
                if hasattr(classic, "purchases"):
                    current_purchases = classic.purchases
                    if isinstance(current_purchases, (set, frozenset)):
                        store_keys = get_all_character_purchase_keys()
                        classic.purchases = frozenset(
                            set(current_purchases).union(store_keys)
                        )
        except Exception:
            pass

        # 6. Refresh active lobby if a game or lobby is currently open
        try:
            if bs and hasattr(bs, "get_foreground_host_session"):
                session = bs.get_foreground_host_session()
                if (
                    session
                    and hasattr(session, "lobby")
                    and hasattr(session.lobby, "reload_profiles")
                ):
                    session.lobby.reload_profiles()
        except Exception:
            pass

        # 7. Notify the user on screen
        try:
            if babase and hasattr(babase, "screenmessage"):
                babase.screenmessage(
                    "All characters unlocked for local play!",
                    color=(0.2, 1.0, 0.4),
                )
        except Exception:
            pass

        return applied


# Direct Dev Console execution support
if __name__ == "__main__":
    success = UnlockAllCharactersPlugin.apply_unlock()
    print(
        f"SUCCESS: All BombSquad characters unlocked dynamically for local play (applied={success})"
    )
