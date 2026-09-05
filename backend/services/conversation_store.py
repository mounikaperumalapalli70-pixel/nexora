"""
Conversation Store Service for NEXORA
Thread-safe persistent conversation storage supporting workspace isolation,
user scoping, multi-turn message history, and token-aware context truncation.
"""

import json
import os
import time
import uuid
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure data directory exists
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"

_lock = threading.Lock()


def _load_data() -> Dict[str, Any]:
    """Loads all conversations from JSON store."""
    if not CONVERSATIONS_FILE.exists():
        return {"conversations": {}}
    try:
        with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"conversations": {}}


def _save_data(data: Dict[str, Any]) -> None:
    """Saves conversations data atomically to JSON store."""
    try:
        temp_file = CONVERSATIONS_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_file.replace(CONVERSATIONS_FILE)
    except Exception as e:
        print(f"[ConversationStore] Error saving conversations: {e}")


def create_conversation(
    user_id: str = "default_user",
    workspace_id: str = "Personal",
    title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates a new persistent conversation entry.
    """
    with _lock:
        data = _load_data()
        conv_id = f"conv_{uuid.uuid4().hex[:12]}"
        now = time.time()
        
        conversation = {
            "id": conv_id,
            "user_id": user_id or "default_user",
            "workspace_id": workspace_id or "Personal",
            "title": title or "New Conversation",
            "created_at": now,
            "updated_at": now,
            "messages": []
        }
        
        data["conversations"][conv_id] = conversation
        _save_data(data)
        return conversation


def get_conversation(conv_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single conversation by ID.
    """
    with _lock:
        data = _load_data()
        conv = data.get("conversations", {}).get(conv_id)
        if not conv:
            return None
        if user_id and conv.get("user_id") and conv["user_id"] != "default_user" and conv["user_id"] != user_id:
            return None
        return conv


def list_conversations(
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Lists conversations filtered by user and workspace, ordered by most recently updated.
    """
    with _lock:
        data = _load_data()
        convs = list(data.get("conversations", {}).values())
        
        filtered = []
        for c in convs:
            # Check user match
            if user_id and c.get("user_id") and c["user_id"] != "default_user" and c["user_id"] != user_id:
                continue
            # Check workspace match
            if workspace_id and c.get("workspace_id") != workspace_id:
                continue
            
            # Create a summary preview without heavy message contents for fast listing
            last_msg = c["messages"][-1]["content"] if c.get("messages") else ""
            summary = {
                "id": c["id"],
                "user_id": c.get("user_id", "default_user"),
                "workspace_id": c.get("workspace_id", "Personal"),
                "title": c.get("title", "Conversation"),
                "created_at": c.get("created_at", 0),
                "updated_at": c.get("updated_at", 0),
                "message_count": len(c.get("messages", [])),
                "last_message_preview": (last_msg[:90] + "...") if len(last_msg) > 90 else last_msg,
                "model": c["messages"][-1].get("model", "") if c.get("messages") and c["messages"][-1].get("role") == "assistant" else ""
            }
            filtered.append(summary)
        
        # Sort descending by updated_at
        filtered.sort(key=lambda x: x.get("updated_at", 0), reverse=True)
        return filtered


def add_message(
    conv_id: str,
    role: str,
    content: str,
    meta: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Appends a message to an existing conversation (or creates one if missing).
    """
    with _lock:
        data = _load_data()
        now = time.time()
        
        if conv_id not in data["conversations"]:
            # Auto-create if not present
            data["conversations"][conv_id] = {
                "id": conv_id,
                "user_id": user_id or "default_user",
                "workspace_id": workspace_id or "Personal",
                "title": (content[:36] + "...") if len(content) > 36 else content,
                "created_at": now,
                "updated_at": now,
                "messages": []
            }
        
        conv = data["conversations"][conv_id]
        
        # If title is default, generate from first user message
        if (conv.get("title") in ["New Conversation", "Conversation", ""] or not conv.get("title")) and role == "user":
            clean_title = content.strip().replace("\n", " ")
            conv["title"] = (clean_title[:38] + "...") if len(clean_title) > 38 else clean_title
        
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"
        message_entry = {
            "id": msg_id,
            "role": role,
            "content": content,
            "timestamp": now
        }
        
        if meta and isinstance(meta, dict):
            for k, v in meta.items():
                if k not in message_entry:
                    message_entry[k] = v
        
        conv["messages"].append(message_entry)
        conv["updated_at"] = now
        
        # Update user/workspace if provided
        if user_id and conv.get("user_id") == "default_user":
            conv["user_id"] = user_id
        if workspace_id:
            conv["workspace_id"] = workspace_id
            
        _save_data(data)
        return message_entry


def delete_conversation(conv_id: str, user_id: Optional[str] = None) -> bool:
    """
    Deletes a conversation by ID.
    """
    with _lock:
        data = _load_data()
        if conv_id in data["conversations"]:
            conv = data["conversations"][conv_id]
            if user_id and conv.get("user_id") and conv["user_id"] != "default_user" and conv["user_id"] != user_id:
                return False
            del data["conversations"][conv_id]
            _save_data(data)
            return True
        return False


def clear_workspace_conversations(
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None
) -> int:
    """
    Deletes all conversations belonging to a specific workspace and user.
    """
    with _lock:
        data = _load_data()
        to_delete = []
        for cid, conv in data.get("conversations", {}).items():
            if user_id and conv.get("user_id") and conv["user_id"] != "default_user" and conv["user_id"] != user_id:
                continue
            if workspace_id and conv.get("workspace_id") != workspace_id:
                continue
            to_delete.append(cid)
        
        for cid in to_delete:
            del data["conversations"][cid]
        
        if to_delete:
            _save_data(data)
        return len(to_delete)


def get_conversation_context(
    conv_id: str,
    max_turns: int = 12,
    max_tokens: int = 3000
) -> List[Dict[str, str]]:
    """
    Retrieves previous message turns formatted for LLM completion calls:
    [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    Applies sliding window context budgeting to avoid context overflow.
    """
    with _lock:
        data = _load_data()
        conv = data.get("conversations", {}).get(conv_id)
        if not conv or not conv.get("messages"):
            return []
        
        msgs = conv["messages"]
        # Take the most recent max_turns messages
        recent = msgs[-max_turns:] if len(msgs) > max_turns else msgs
        
        token_estimate = 0
        included = []
        for m in reversed(recent):
            content = m.get("content", "")
            turn_tokens = max(1, len(content) // 4)
            if token_estimate + turn_tokens > max_tokens and included:
                break
            role = m.get("role", "user")
            if role in ["user", "human"]:
                norm_role = "user"
            elif role in ["assistant", "ai", "nexora", "bot"]:
                norm_role = "assistant"
            elif role == "system":
                norm_role = "system"
            else:
                norm_role = "user"
                
            included.insert(0, {"role": norm_role, "content": content})
            token_estimate += turn_tokens
            
        return included
