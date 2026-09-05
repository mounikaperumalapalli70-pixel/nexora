"""
Workspace Store Service for NEXORA
Thread-safe persistent workspace storage per user.
"""

import json
import os
import time
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
WORKSPACES_FILE = DATA_DIR / "workspaces.json"

_lock = threading.Lock()

DEFAULT_WORKSPACES = [
    {"name": "Personal", "description": "Personal research, day-to-day queries, and ideas", "created_at": 1700000000},
    {"name": "College", "description": "Academic coursework, assignments, and study materials", "created_at": 1700000000},
    {"name": "Research", "description": "Deep literature review, paper synthesis, and technical explorations", "created_at": 1700000000},
    {"name": "Hackathons", "description": "Rapid prototyping, MVP roadmaps, and competitive coding", "created_at": 1700000000}
]


def _load_data() -> Dict[str, Any]:
    if not WORKSPACES_FILE.exists():
        return {"workspaces": {}}
    try:
        with open(WORKSPACES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"workspaces": {}}


def _save_data(data: Dict[str, Any]) -> None:
    try:
        temp_file = WORKSPACES_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_file.replace(WORKSPACES_FILE)
    except Exception as e:
        print(f"[WorkspaceStore] Error saving workspaces: {e}")


def list_workspaces(user_id: str = "default_user") -> List[Dict[str, Any]]:
    """
    Returns user workspaces or creates defaults if none exist.
    """
    with _lock:
        data = _load_data()
        all_user_ws = data.setdefault("workspaces", {})
        
        uid = user_id or "default_user"
        if uid not in all_user_ws or not all_user_ws[uid]:
            # Initialize with default 4 workspaces
            all_user_ws[uid] = [dict(w) for w in DEFAULT_WORKSPACES]
            _save_data(data)
            
        return all_user_ws[uid]


def create_workspace(user_id: str, name: str, description: str = "") -> Dict[str, Any]:
    """
    Creates a new workspace for the given user.
    """
    with _lock:
        data = _load_data()
        all_user_ws = data.setdefault("workspaces", {})
        uid = user_id or "default_user"
        
        if uid not in all_user_ws:
            all_user_ws[uid] = [dict(w) for w in DEFAULT_WORKSPACES]
            
        clean_name = name.strip()
        # Check if already exists
        for ws in all_user_ws[uid]:
            if ws["name"].lower() == clean_name.lower():
                return ws
                
        new_ws = {
            "name": clean_name,
            "description": description.strip() or f"{clean_name} workspace",
            "created_at": time.time()
        }
        all_user_ws[uid].append(new_ws)
        _save_data(data)
        return new_ws


def delete_workspace(user_id: str, name: str) -> bool:
    """
    Deletes a workspace for the given user. Cannot delete if it is the only workspace.
    """
    with _lock:
        data = _load_data()
        all_user_ws = data.get("workspaces", {})
        uid = user_id or "default_user"
        
        if uid not in all_user_ws:
            return False
            
        user_list = all_user_ws[uid]
        if len(user_list) <= 1:
            return False
            
        clean_name = name.strip().lower()
        new_list = [w for w in user_list if w["name"].lower() != clean_name]
        
        if len(new_list) < len(user_list):
            all_user_ws[uid] = new_list
            _save_data(data)
            return True
        return False
