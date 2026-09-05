"""
Prompt Store Service for NEXORA
Thread-safe persistent prompt templates storage with categories and favorites.
"""

import json
import os
import time
import uuid
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
PROMPTS_FILE = DATA_DIR / "prompts.json"

_lock = threading.Lock()

DEFAULT_PROMPTS = [
    {
        "id": "p_code_1",
        "title": "Python Architecture Refactor",
        "category": "Coding",
        "content": "Help me write clean, modular, and high-throughput Python async code with proper type annotations, robust error handling, and unit test coverage.",
        "is_favorite": True,
        "created_at": 1700000000
    },
    {
        "id": "p_research_1",
        "title": "Literature Synthesis & Key Findings",
        "category": "Research",
        "content": "Synthesize the core mechanisms, performance benchmarks, and limitations described in this scientific document or topic into a structured briefing.",
        "is_favorite": True,
        "created_at": 1700000000
    },
    {
        "id": "p_writing_1",
        "title": "Executive Summary & Key Takeaways",
        "category": "Writing",
        "content": "Condense the provided text into a crisp executive summary with bulleted action items, risk factors, and strategic next steps.",
        "is_favorite": False,
        "created_at": 1700000000
    },
    {
        "id": "p_study_1",
        "title": "Feynman Technique Explainer",
        "category": "Study",
        "content": "Explain this complex technical concept using intuitive real-world analogies, step-by-step intuition, and clear mathematical foundations.",
        "is_favorite": True,
        "created_at": 1700000000
    },
    {
        "id": "p_business_1",
        "title": "SaaS Go-to-Market Strategy",
        "category": "Business",
        "content": "Draft a comprehensive 4-week launch roadmap for an AI software product, including positioning, distribution channels, and KPI tracking.",
        "is_favorite": False,
        "created_at": 1700000000
    },
    {
        "id": "p_data_1",
        "title": "Data Analysis & Pattern Insights",
        "category": "Data Analysis",
        "content": "Analyze the following dataset distribution, identify anomalies or correlations, and propose optimization hypotheses.",
        "is_favorite": False,
        "created_at": 1700000000
    }
]


def _load_data() -> Dict[str, Any]:
    if not PROMPTS_FILE.exists():
        return {"prompts": {}}
    try:
        with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"prompts": {}}


def _save_data(data: Dict[str, Any]) -> None:
    try:
        temp_file = PROMPTS_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_file.replace(PROMPTS_FILE)
    except Exception as e:
        print(f"[PromptStore] Error saving prompts: {e}")


def list_prompts(user_id: str = "default_user", category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns user's saved prompt library.
    """
    with _lock:
        data = _load_data()
        all_user_prompts = data.setdefault("prompts", {})
        uid = user_id or "default_user"
        
        if uid not in all_user_prompts or not all_user_prompts[uid]:
            all_user_prompts[uid] = [dict(p) for p in DEFAULT_PROMPTS]
            _save_data(data)
            
        prompts = all_user_prompts[uid]
        if category and category.lower() != "all":
            prompts = [p for p in prompts if p.get("category", "").lower() == category.lower()]
            
        return prompts


def create_prompt(
    user_id: str,
    title: str,
    content: str,
    category: str = "Custom",
    is_favorite: bool = False
) -> Dict[str, Any]:
    """
    Creates and saves a new prompt template.
    """
    with _lock:
        data = _load_data()
        all_user_prompts = data.setdefault("prompts", {})
        uid = user_id or "default_user"
        
        if uid not in all_user_prompts:
            all_user_prompts[uid] = [dict(p) for p in DEFAULT_PROMPTS]
            
        new_prompt = {
            "id": f"p_{uuid.uuid4().hex[:8]}",
            "title": title.strip(),
            "content": content.strip(),
            "category": category.strip() or "Custom",
            "is_favorite": bool(is_favorite),
            "created_at": time.time()
        }
        all_user_prompts[uid].insert(0, new_prompt)
        _save_data(data)
        return new_prompt


def update_prompt(
    user_id: str,
    prompt_id: str,
    updates: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Updates an existing prompt.
    """
    with _lock:
        data = _load_data()
        all_user_prompts = data.get("prompts", {})
        uid = user_id or "default_user"
        
        if uid not in all_user_prompts:
            return None
            
        for p in all_user_prompts[uid]:
            if p["id"] == prompt_id:
                if "title" in updates:
                    p["title"] = updates["title"].strip()
                if "content" in updates:
                    p["content"] = updates["content"].strip()
                if "category" in updates:
                    p["category"] = updates["category"].strip()
                if "is_favorite" in updates:
                    p["is_favorite"] = bool(updates["is_favorite"])
                p["updated_at"] = time.time()
                _save_data(data)
                return p
        return None


def delete_prompt(user_id: str, prompt_id: str) -> bool:
    """
    Deletes a prompt from the user's library.
    """
    with _lock:
        data = _load_data()
        all_user_prompts = data.get("prompts", {})
        uid = user_id or "default_user"
        
        if uid not in all_user_prompts:
            return False
            
        user_prompts = all_user_prompts[uid]
        filtered = [p for p in user_prompts if p["id"] != prompt_id]
        
        if len(filtered) < len(user_prompts):
            all_user_prompts[uid] = filtered
            _save_data(data)
            return True
        return False
