"""
User Store Service for NEXORA
Thread-safe persistent storage for user profiles, Google accounts, and email logins.
"""

import json
import os
import time
import uuid
import re
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"

_lock = threading.Lock()


def _load_users() -> Dict[str, Any]:
    """Loads all user records from JSON store."""
    if not USERS_FILE.exists():
        return {"users": {}}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"users": {}}


def _save_users(data: Dict[str, Any]) -> None:
    """Atomically saves user records to JSON store."""
    try:
        temp_file = USERS_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_file.replace(USERS_FILE)
    except Exception as e:
        print(f"[UserStore] Error saving users: {e}")


def _derive_name_from_email(email: str) -> str:
    """
    Derives a friendly display name from an email address:
    e.g. 'charan.teja@gmail.com' -> 'Charan Teja'
    e.g. 'john_doe@company.com' -> 'John Doe'
    """
    if not email or "@" not in email:
        return "User"
    local_part = email.split("@")[0]
    # Replace dots, underscores, hyphens, and numbers with spaces
    cleaned = re.sub(r"[._\-+]+", " ", local_part)
    cleaned = re.sub(r"\d+", "", cleaned).strip()
    if not cleaned:
        cleaned = local_part
    words = [w.capitalize() for w in cleaned.split()]
    return " ".join(words) if words else "User"


def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user profile by user_id or email."""
    with _lock:
        data = _load_users()
        users = data.get("users", {})
        if user_id in users:
            return users[user_id]
        # Look up by email
        for u in users.values():
            if u.get("email") == user_id:
                return u
        return None


def get_or_create_user(
    email: str,
    name: Optional[str] = None,
    picture: Optional[str] = None,
    provider: str = "google",
    user_id_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves an existing user record or creates a new one with defaults.
    """
    with _lock:
        data = _load_users()
        users = data.setdefault("users", {})
        now = time.time()
        
        email_clean = email.strip().lower() if email else "anonymous@nexora.ai"
        
        # Check if user already exists with this email
        existing_user_id = None
        for uid, u in users.items():
            if u.get("email", "").lower() == email_clean:
                existing_user_id = uid
                break
        
        if existing_user_id:
            user = users[existing_user_id]
            user["last_login"] = now
            if name and (user.get("name") in ["User", "", None] or provider == "google"):
                user["name"] = name
                user["first_name"] = name.split()[0] if name else "User"
            if picture:
                user["picture"] = picture
            if provider:
                user["provider"] = provider
            _save_users(data)
            return user
        
        # Create new user record
        uid = user_id_override or f"usr_{uuid.uuid4().hex[:10]}"
        display_name = name.strip() if name and name.strip() else _derive_name_from_email(email_clean)
        first_name = display_name.split()[0] if display_name else "User"
        
        new_user = {
            "id": uid,
            "email": email_clean,
            "name": display_name,
            "first_name": first_name,
            "picture": picture or "",
            "provider": provider,
            "plan": "Free Plan",
            "created_at": now,
            "last_login": now,
            "preferences": {
                "default_workspace": "Personal",
                "theme": "light",
                "default_mode": "auto"
            }
        }
        
        users[uid] = new_user
        _save_users(data)
        return new_user


def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates profile fields for a user.
    """
    with _lock:
        data = _load_users()
        users = data.get("users", {})
        
        target_uid = None
        if user_id in users:
            target_uid = user_id
        else:
            for uid, u in users.items():
                if u.get("email") == user_id:
                    target_uid = uid
                    break
        
        if not target_uid:
            return None
        
        user = users[target_uid]
        if "name" in updates and updates["name"]:
            user["name"] = updates["name"].strip()
            user["first_name"] = user["name"].split()[0]
        if "picture" in updates:
            user["picture"] = updates["picture"]
        if "plan" in updates:
            user["plan"] = updates["plan"]
        if "preferences" in updates and isinstance(updates["preferences"], dict):
            user.setdefault("preferences", {}).update(updates["preferences"])
            
        user["updated_at"] = time.time()
        _save_users(data)
        return user
