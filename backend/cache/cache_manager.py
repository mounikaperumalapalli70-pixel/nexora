import hashlib
import time
from typing import Any, Dict, Optional

# In-memory prompt & response cache
# Structure: { cache_key: { "response": dict, "created_at": float, "hit_count": int } }
_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}


def generate_cache_key(message: str) -> str:
    """
    Generates a deterministic cache key for a prompt query.
    Normalizes whitespace and casing before hashing.
    """
    normalized = " ".join(message.strip().lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def get_cached_response(key: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves cached response dict by key, if it exists.
    Updates hit counter.
    """
    entry = _MEMORY_CACHE.get(key)
    if entry:
        entry["hit_count"] += 1
        return entry["response"]
    return None


def set_cached_response(key: str, response: Dict[str, Any]) -> None:
    """
    Stores a response in the in-memory cache.
    """
    _MEMORY_CACHE[key] = {
        "response": response,
        "created_at": time.time(),
        "hit_count": 0
    }


def clear_cache() -> None:
    """
    Clears all cached entries.
    """
    _MEMORY_CACHE.clear()


def get_cache_stats() -> Dict[str, Any]:
    """
    Returns current cache status and stored keys.
    """
    return {
        "total_entries": len(_MEMORY_CACHE),
        "keys": list(_MEMORY_CACHE.keys())
    }
