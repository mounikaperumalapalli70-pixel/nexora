import json
import os
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse

# Explicitly load backend/.env using absolute path
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

from models import call_model, get_providers_status
from router.classifier import classify_request, get_classification_reason
from router.router import select_model, get_baseline_model, get_all_models
from cache.cache_manager import (
    generate_cache_key,
    get_cached_response,
    set_cached_response,
    clear_cache,
    get_cache_stats
)
from services.cost_tracker import calculate_request_cost
from services.quality_checker import evaluate_quality
from services.metrics import (
    record_request,
    get_metrics_summary,
    reset_metrics
)
from services.conversation_store import (
    create_conversation,
    get_conversation,
    list_conversations,
    add_message,
    delete_conversation,
    clear_workspace_conversations,
    get_conversation_context
)
from services.user_store import get_or_create_user, get_user, update_user_profile
from services.workspace_store import list_workspaces, create_workspace, delete_workspace
from services.prompt_store import list_prompts, create_prompt, update_prompt, delete_prompt
from auth import router as auth_router

app = FastAPI(
    title="NEXORA",
    description="Intelligent LLM Cost Optimization & Smart Model Routing",
    version="1.0.0"
)

SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "nexora_super_secret_session_key_2026")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")

is_production = ENVIRONMENT == "production"
cookie_same_site = "none" if (is_production and FRONTEND_URL) else "lax"
cookie_https_only = is_production

# 1. Session Middleware for secure authenticated sessions
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    session_cookie="nexora_session",
    max_age=86400 * 7,
    same_site=cookie_same_site,
    https_only=cookie_https_only
)

# Parse allowed origins for CORS
allowed_origins_list = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5173"
]
if FRONTEND_URL and FRONTEND_URL not in allowed_origins_list:
    allowed_origins_list.append(FRONTEND_URL)

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if raw_origins:
    for orig in raw_origins.split(","):
        orig_clean = orig.strip().rstrip("/")
        if orig_clean and orig_clean not in allowed_origins_list:
            allowed_origins_list.append(orig_clean)

# 2. CORS for production and development with credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register Authentication Router
app.include_router(auth_router)

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/dashboard", StaticFiles(directory=frontend_dir, html=True), name="dashboard")


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    workspace_id: Optional[str] = "Personal"
    mode: Optional[str] = "auto"  # "auto", "fast", "pro"
    use_context: Optional[bool] = True
    context: Optional[str] = None
    use_search: Optional[bool] = False


class ClassifyRequest(BaseModel):
    message: str


class CreateConversationRequest(BaseModel):
    workspace_id: Optional[str] = "Personal"
    title: Optional[str] = "New Conversation"


class SaveProviderKeysRequest(BaseModel):
    openrouter_key: Optional[str] = None
    groq_key: Optional[str] = None
    openai_key: Optional[str] = None
    gemini_key: Optional[str] = None


class AccountSettingsRequest(BaseModel):
    name: Optional[str] = None


class WorkspaceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""


class PromptCreateRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "Custom"
    is_favorite: Optional[bool] = False


class PromptUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_favorite: Optional[bool] = None


def _get_user_id_from_request(request: Request) -> str:
    """Helper to extract user id from session or fallback to default."""
    try:
        user = request.session.get("user")
        if user and isinstance(user, dict) and (user.get("id") or user.get("email")):
            return user.get("id") or user.get("email")
    except Exception:
        pass
    return "default_user"


# ============================================================
# SPA Page Route Endpoints
# ============================================================

@app.get("/")
@app.get("/login")
@app.get("/home")
@app.get("/impact")
@app.get("/routing-core")
@app.get("/explore")
@app.get("/prompts")
@app.get("/history")
@app.get("/analytics")
def serve_app():
    """
    Serves the NEXORA frontend single-page application for all primary routes.
    """
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return RedirectResponse(url="/dashboard/")


@app.get("/style.css")
def serve_css():
    css_path = os.path.join(frontend_dir, "style.css")
    if os.path.exists(css_path):
        return FileResponse(css_path, media_type="text/css")
    return {"error": "style.css not found"}


@app.get("/app.js")
def serve_js():
    js_path = os.path.join(frontend_dir, "app.js")
    if os.path.exists(js_path):
        return FileResponse(js_path, media_type="application/javascript")
    return {"error": "app.js not found"}


@app.get("/health")
def healthcheck():
    """
    Healthcheck and status of NEXORA backend.
    """
    return {
        "status": "online",
        "service": "NEXORA - LLM Cost Optimizer & Smart Router",
        "tagline": "Smarter AI. Lower Costs. Greater Impact.",
        "version": "1.0.0"
    }


# ============================================================
# Provider Health & Settings Endpoints
# ============================================================

@app.get("/api/providers/status")
def get_providers_health():
    """
    Returns live connection and configuration status for all supported providers.
    """
    return {
        "status": "success",
        "providers": get_providers_status()
    }


@app.post("/api/settings/providers")
def save_provider_keys(payload: SaveProviderKeysRequest):
    """
    Safely saves configured AI provider API keys to backend/.env and reloads runtime variables.
    """
    env_lines = []
    existing_vars = {}

    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if line_str and not line_str.startswith("#") and "=" in line_str:
                    k, v = line_str.split("=", 1)
                    existing_vars[k.strip()] = v.strip()

    # Update provider keys if provided
    if payload.openrouter_key is not None and not payload.openrouter_key.startswith("••"):
        existing_vars["OPENROUTER_API_KEY"] = payload.openrouter_key.strip()
    if payload.groq_key is not None and not payload.groq_key.startswith("••"):
        existing_vars["GROQ_API_KEY"] = payload.groq_key.strip()
    if payload.openai_key is not None and not payload.openai_key.startswith("••"):
        existing_vars["OPENAI_API_KEY"] = payload.openai_key.strip()
    if payload.gemini_key is not None and not payload.gemini_key.startswith("••"):
        existing_vars["GEMINI_API_KEY"] = payload.gemini_key.strip()

    # Write back to .env
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        for k, v in existing_vars.items():
            f.write(f"{k}={v}\n")

    # Reload environment
    load_dotenv(dotenv_path=ENV_PATH, override=True)

    return {
        "status": "success",
        "message": "AI Provider credentials successfully updated",
        "providers": get_providers_status()
    }


@app.post("/api/settings/account")
def update_account_settings(payload: AccountSettingsRequest, req: Request):
    """
    Updates authenticated user's account settings (e.g. display name).
    """
    user_id = _get_user_id_from_request(req)
    if not user_id or user_id == "default_user":
        raise HTTPException(status_code=401, detail="Please sign in to update account settings")

    updated = update_user_profile(user_id, {"name": payload.name})
    if updated:
        req.session["user"] = updated
        return {"status": "success", "user": updated}
    raise HTTPException(status_code=404, detail="User not found")


# ============================================================
# Classification & Routing
# ============================================================

@app.post("/classify")
def classify(request: ClassifyRequest):
    """
    Classifies prompt difficulty as 'easy', 'medium', or 'hard' and provides routing reasoning.
    """
    difficulty = classify_request(request.message)
    model_info = select_model(difficulty)
    reason = get_classification_reason(difficulty, request.message)

    tier_map = {
        "easy": {
            "tier": "CHEAP",
            "model_label": "Haiku / Small (FAST)",
            "model_name": "Haiku (Fast, Low Cost)",
            "estimated_cost": 0.0012,
            "baseline_cost": 0.0240,
            "cost_saved": "95%",
            "cache_status": "Hit"
        },
        "medium": {
            "tier": "BALANCED",
            "model_label": "GPT-3.5 / Balanced (NORMAL)",
            "model_name": "GPT-3.5 (Balanced)",
            "estimated_cost": 0.0048,
            "baseline_cost": 0.0240,
            "cost_saved": "80%",
            "cache_status": "Miss"
        },
        "hard": {
            "tier": "POWERFUL",
            "model_label": "GPT-4 / Claude (PRO)",
            "model_name": "GPT-4 / Claude 3 (Powerful)",
            "estimated_cost": 0.0180,
            "baseline_cost": 0.0240,
            "cost_saved": "25%",
            "cache_status": "Miss"
        }
    }

    tier_info = tier_map.get(difficulty, tier_map["medium"])

    return {
        "message": request.message,
        "difficulty": difficulty,
        "tier": tier_info["tier"],
        "recommended_tier": model_info.get("tier", tier_info["tier"]),
        "recommended_model": tier_info["model_label"],
        "model_name": tier_info["model_name"],
        "reason": reason,
        "estimated_cost": tier_info["estimated_cost"],
        "baseline_cost": tier_info["baseline_cost"],
        "cost_saved": tier_info["cost_saved"],
        "cache_status": tier_info["cache_status"]
    }


# ============================================================
# Main Chat Optimization & Multi-turn Execution Pipeline
# ============================================================

@app.post("/chat")
@app.post("/api/chat")
def chat(request: ChatRequest, req: Request):
    """
    Main optimization & multi-turn execution pipeline:
    1. Resolves active user session & workspace
    2. Retrieves / creates conversation in persistent store
    3. Handles mode selection (Auto Router / Fast / Pro)
    4. Gathers multi-turn context (if Use Context is enabled)
    5. Checks prompt cache or calls real neural model with smart fallback
    6. Calculates exact token costs & benchmark savings
    7. Persists user query & assistant response into conversation history
    8. Records telemetry in global metrics
    """
    start_time = time.time()
    user_id = _get_user_id_from_request(req)
    workspace_id = request.workspace_id or "Personal"

    # 1. Ensure persistent conversation exists
    conv_id = request.conversation_id
    if not conv_id:
        new_conv = create_conversation(
            user_id=user_id,
            workspace_id=workspace_id,
            title=(request.message[:38] + "...") if len(request.message) > 38 else request.message
        )
        conv_id = new_conv["id"]

    # 2. Determine routing tier & difficulty based on mode
    mode = (request.mode or "auto").lower()
    if mode == "fast":
        difficulty = "easy"
        reason = "Direct FAST Mode override selected by user for minimal latency and cost."
    elif mode == "pro":
        difficulty = "hard"
        reason = "Direct PRO Mode override selected by user for maximum neural reasoning depth."
    else:
        difficulty = classify_request(request.message)
        reason = get_classification_reason(difficulty, request.message)

    # 3. Select model & baseline
    model_info = select_model(difficulty)
    baseline_info = get_baseline_model()

    # 4. Gather previous conversation history if use_context is True
    history_turns: List[Dict[str, str]] = []
    if request.use_context:
        history_turns = get_conversation_context(conv_id, max_turns=12, max_tokens=2500)

    # 5. Check prompt cache (only for standalone zero-history queries without special context/search)
    cache_key = generate_cache_key(request.message) if not history_turns and not request.context and not request.use_search else None
    cached_entry = get_cached_response(cache_key) if cache_key else None

    if cached_entry:
        answer = cached_entry["answer"]
        cache_hit = True
        latency_ms = round((time.time() - start_time) * 1000, 2)

        cost_data = calculate_request_cost(
            prompt=request.message,
            response=answer,
            selected_model_info=model_info,
            baseline_model_info=baseline_info,
            cache_hit=True
        )
        quality_data = evaluate_quality(request.message, answer)
        provider_name = "NEXORA Cache"
        model_used = model_info["name"]
        is_config_error = False

    else:
        cache_hit = False

        system_prompt = (
            "You are NEXORA AI, an intelligent, helpful, and concise AI optimization assistant. "
            "Respond directly, clearly, and insightfully to the user's queries."
        )
        if request.context:
            system_prompt += f"\n\n[Uploaded Document / Attached Context]:\n{request.context}"
        if request.use_search:
            try:
                from services.search_service import search_ddg
                search_res = search_ddg(request.message)
                if search_res:
                    system_prompt += f"\n\n[Live Search Information]:\n{search_res}"
            except Exception:
                pass

        # Call multi-provider caller with Smart Fallback
        call_result = call_model(
            message=request.message,
            model=model_info["model"],
            system_prompt=system_prompt,
            history=history_turns
        )

        answer = call_result.get("answer", "")
        exact_usage = call_result.get("usage", {})
        provider_name = call_result.get("provider", "Neural Engine")
        model_used = call_result.get("model_used", model_info["name"])
        is_config_error = call_result.get("is_configuration_error", False)

        latency_ms = round((time.time() - start_time) * 1000, 2)

        # Compute costs & savings
        cost_data = calculate_request_cost(
            prompt=request.message,
            response=answer,
            selected_model_info=model_info,
            baseline_model_info=baseline_info,
            cache_hit=False,
            exact_usage=exact_usage
        )

        quality_data = evaluate_quality(request.message, answer)

        if cache_key and call_result.get("success", False):
            set_cached_response(cache_key, {
                "answer": answer,
                "difficulty": difficulty,
                "model": model_info["name"]
            })

    tier_label_map = {
        "easy": ("cheap", "Haiku / Small (FAST)"),
        "medium": ("normal", "GPT-3.5 / Balanced (NORMAL)"),
        "hard": ("powerful", "GPT-4 / Claude (PRO)")
    }
    tier_slug, model_clean_label = tier_label_map.get(difficulty.lower(), ("normal", "GPT-3.5 / Balanced (NORMAL)"))

    # 6. Save User and Assistant messages to persistent conversation storage
    user_msg_entry = add_message(
        conv_id=conv_id,
        role="user",
        content=request.message,
        user_id=user_id,
        workspace_id=workspace_id
    )

    meta_payload = {
        "model": model_clean_label,
        "selected_model": model_used,
        "provider": provider_name,
        "tier": tier_slug,
        "tokens": {
            "input": cost_data["input_tokens"],
            "output": cost_data["output_tokens"],
            "total": cost_data["total_tokens"]
        },
        "cost": cost_data["routed_cost"],
        "baseline_cost": cost_data["baseline_cost"],
        "savings": cost_data["savings"],
        "latency_ms": latency_ms,
        "quality_score": quality_data.get("score", 95.0),
        "difficulty": difficulty,
        "reason": reason,
        "cache_hit": cache_hit,
        "mode": mode,
        "is_configuration_error": is_config_error
    }

    assistant_msg_entry = add_message(
        conv_id=conv_id,
        role="assistant",
        content=answer,
        meta=meta_payload,
        user_id=user_id,
        workspace_id=workspace_id
    )

    # 7. Record in aggregate metrics
    record_request(
        difficulty=difficulty,
        cost=cost_data["routed_cost"],
        baseline_cost=cost_data["baseline_cost"],
        savings=cost_data["savings"],
        latency_ms=latency_ms,
        cache_hit=cache_hit,
        quality_score=quality_data.get("score"),
        preview_prompt=request.message,
        selected_model=model_clean_label
    )

    conv_data = get_conversation(conv_id, user_id=user_id)
    conv_title = conv_data.get("title", "Conversation") if conv_data else "Conversation"

    return {
        "conversation_id": conv_id,
        "conversation_title": conv_title,
        "user_message_id": user_msg_entry["id"],
        "message_id": assistant_msg_entry["id"],
        "answer": answer,
        "difficulty": difficulty,
        "tier": tier_slug,
        "mode": mode,
        "model": model_clean_label,
        "selected_model": model_used,
        "provider": provider_name,
        "recommended_model": model_clean_label,
        "reason": reason,
        "cache_hit": cache_hit,
        "is_configuration_error": is_config_error,
        "estimated_tokens": cost_data["total_tokens"],
        "estimated_cost": cost_data["routed_cost"],
        "baseline_cost": cost_data["baseline_cost"],
        "estimated_savings": cost_data["savings"],
        "cost_saved_percent": cost_data["savings_percentage"],
        "savings_percentage": cost_data["savings_percentage"],
        "tokens": {
            "input": cost_data["input_tokens"],
            "output": cost_data["output_tokens"],
            "total": cost_data["total_tokens"]
        },
        "latency_ms": latency_ms,
        "quality_score": quality_data.get("score", 95.0),
        "workspace_id": workspace_id
    }


# ============================================================
# Persistent Conversations API Endpoints
# ============================================================

@app.get("/api/conversations")
def get_conversations(
    req: Request,
    workspace_id: Optional[str] = Query(None)
):
    """
    Returns list of saved conversations for the active user & workspace.
    """
    user_id = _get_user_id_from_request(req)
    convs = list_conversations(user_id=user_id, workspace_id=workspace_id)
    return {
        "status": "success",
        "workspace_id": workspace_id,
        "conversations": convs
    }


@app.get("/api/conversations/{conversation_id}")
def get_single_conversation(conversation_id: str, req: Request):
    """
    Loads complete conversation and message history.
    """
    user_id = _get_user_id_from_request(req)
    conv = get_conversation(conversation_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "status": "success",
        "conversation": conv
    }


@app.post("/api/conversations/new")
def new_conversation(payload: CreateConversationRequest, req: Request):
    """
    Starts a new isolated conversation session.
    """
    user_id = _get_user_id_from_request(req)
    conv = create_conversation(
        user_id=user_id,
        workspace_id=payload.workspace_id or "Personal",
        title=payload.title or "New Conversation"
    )
    return {
        "status": "success",
        "conversation": conv
    }


@app.delete("/api/conversations/{conversation_id}")
def delete_single_conversation(conversation_id: str, req: Request):
    """
    Deletes a conversation by ID.
    """
    user_id = _get_user_id_from_request(req)
    deleted = delete_conversation(conversation_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    return {"status": "success", "message": f"Deleted conversation {conversation_id}"}


@app.delete("/api/conversations")
def clear_conversations(req: Request, workspace_id: Optional[str] = Query(None)):
    """
    Clears all conversations in a workspace.
    """
    user_id = _get_user_id_from_request(req)
    count = clear_workspace_conversations(user_id=user_id, workspace_id=workspace_id)
    return {"status": "success", "deleted_count": count}


# ============================================================
# Persistent Workspaces API Endpoints
# ============================================================

@app.get("/api/workspaces")
def get_workspaces(req: Request):
    """
    Returns user workspaces with descriptions and metadata.
    """
    user_id = _get_user_id_from_request(req)
    ws = list_workspaces(user_id=user_id)
    return {"status": "success", "workspaces": ws}


@app.post("/api/workspaces")
def create_new_workspace(payload: WorkspaceCreateRequest, req: Request):
    """
    Creates a new workspace for the current user.
    """
    user_id = _get_user_id_from_request(req)
    ws = create_workspace(user_id=user_id, name=payload.name, description=payload.description or "")
    return {"status": "success", "workspace": ws}


@app.delete("/api/workspaces/{name}")
def delete_user_workspace(name: str, req: Request):
    """
    Deletes a workspace.
    """
    user_id = _get_user_id_from_request(req)
    deleted = delete_workspace(user_id=user_id, name=name)
    if not deleted:
        raise HTTPException(status_code=400, detail="Cannot delete default or non-existing workspace")
    return {"status": "success", "message": f"Deleted workspace {name}"}


# ============================================================
# Persistent Prompt Library API Endpoints
# ============================================================

@app.get("/api/prompts")
def get_prompts(req: Request, category: Optional[str] = Query(None)):
    """
    Returns saved prompt templates for the current user.
    """
    user_id = _get_user_id_from_request(req)
    prompts = list_prompts(user_id=user_id, category=category)
    return {"status": "success", "prompts": prompts}


@app.post("/api/prompts")
def create_new_prompt(payload: PromptCreateRequest, req: Request):
    """
    Creates and saves a prompt to user library.
    """
    user_id = _get_user_id_from_request(req)
    p = create_prompt(
        user_id=user_id,
        title=payload.title,
        content=payload.content,
        category=payload.category or "Custom",
        is_favorite=payload.is_favorite or False
    )
    return {"status": "success", "prompt": p}


@app.put("/api/prompts/{prompt_id}")
def update_existing_prompt(prompt_id: str, payload: PromptUpdateRequest, req: Request):
    """
    Updates an existing prompt.
    """
    user_id = _get_user_id_from_request(req)
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    p = update_prompt(user_id=user_id, prompt_id=prompt_id, updates=updates)
    if not p:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"status": "success", "prompt": p}


@app.delete("/api/prompts/{prompt_id}")
def delete_single_prompt(prompt_id: str, req: Request):
    """
    Deletes a prompt from library.
    """
    user_id = _get_user_id_from_request(req)
    deleted = delete_prompt(user_id=user_id, prompt_id=prompt_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"status": "success", "message": f"Deleted prompt {prompt_id}"}


# ============================================================
# Metrics, Analytics & Benchmarking Endpoints
# ============================================================

@app.get("/metrics")
@app.get("/analytics")
def get_metrics():
    """
    Returns real-time aggregated metrics and recent activity logs.
    """
    return get_metrics_summary()


@app.get("/history")
def get_history():
    """
    Returns recent request history logs.
    """
    summary = get_metrics_summary()
    return {"history": summary.get("recent_requests", [])}


@app.post("/benchmark")
def run_benchmark():
    """
    Runs benchmark dataset from benchmark.json through NEXORA pipeline.
    """
    benchmark_file = os.path.join(os.path.dirname(__file__), "data", "benchmark.json")

    if not os.path.exists(benchmark_file):
        return {"error": "benchmark.json dataset not found"}

    with open(benchmark_file, "r", encoding="utf-8") as f:
        benchmark_items = json.load(f)

    baseline_info = get_baseline_model()
    results = []

    total_baseline_cost = 0.0
    total_optimized_cost = 0.0
    total_latency_ms = 0.0
    quality_scores = []

    for item in benchmark_items:
        query_text = item["query"]
        t0 = time.time()

        diff = classify_request(query_text)
        chosen_model = select_model(diff)

        cache_k = generate_cache_key(query_text)
        cached = get_cached_response(cache_k)

        if cached:
            ans = cached["answer"]
            c_hit = True
            lat = round((time.time() - t0) * 1000, 2)
            c_data = calculate_request_cost(query_text, ans, chosen_model, baseline_info, cache_hit=True)
            q_data = evaluate_quality(query_text, ans)
        else:
            c_hit = False
            call_res = call_model(query_text, chosen_model["model"])
            ans = call_res.get("answer", "")
            exact_usage = call_res.get("usage", {})
            lat = round((time.time() - t0) * 1000, 2)
            c_data = calculate_request_cost(query_text, ans, chosen_model, baseline_info, cache_hit=False, exact_usage=exact_usage)
            q_data = evaluate_quality(query_text, ans)
            if call_res.get("success", False):
                set_cached_response(cache_k, {"answer": ans, "difficulty": diff, "model": chosen_model["name"]})

        total_baseline_cost += c_data["baseline_cost"]
        total_optimized_cost += c_data["routed_cost"]
        total_latency_ms += lat
        if q_data.get("score"):
            quality_scores.append(q_data["score"])

        record_request(
            difficulty=diff,
            cost=c_data["routed_cost"],
            baseline_cost=c_data["baseline_cost"],
            savings=c_data["savings"],
            latency_ms=lat,
            cache_hit=c_hit,
            quality_score=q_data.get("score"),
            preview_prompt=query_text,
            selected_model=chosen_model["name"]
        )

        results.append({
            "id": item["id"],
            "query": query_text,
            "category": item.get("category", "General"),
            "difficulty": diff,
            "selected_model": chosen_model["name"],
            "tier": chosen_model["tier"],
            "cache_hit": c_hit,
            "routed_cost": c_data["routed_cost"],
            "baseline_cost": c_data["baseline_cost"],
            "savings": c_data["savings"],
            "latency_ms": lat,
            "quality_score": q_data.get("score", 95.0)
        })

    num_queries = len(benchmark_items)
    total_savings = max(0.0, total_baseline_cost - total_optimized_cost)
    savings_pct = (total_savings / total_baseline_cost * 100.0) if total_baseline_cost > 0 else 0.0
    avg_latency = round(total_latency_ms / num_queries, 2) if num_queries > 0 else 0.0
    avg_quality = round(sum(quality_scores) / len(quality_scores), 1) if quality_scores else 95.0

    return {
        "status": "success",
        "total_queries": num_queries,
        "baseline_cost": round(total_baseline_cost, 6),
        "optimized_cost": round(total_optimized_cost, 6),
        "total_savings": round(total_savings, 6),
        "savings_percentage": round(savings_pct, 2),
        "average_latency_ms": avg_latency,
        "average_quality_score": avg_quality,
        "results": results
    }


@app.get("/models")
def list_models():
    """
    Returns available routing models and the baseline expensive model.
    """
    return {
        "models": get_all_models(),
        "baseline": get_baseline_model()
    }


@app.get("/cache/stats")
def cache_stats():
    """
    Returns cache usage stats.
    """
    return get_cache_stats()


@app.post("/cache/clear")
def clear_all_cache():
    """
    Clears the in-memory cache.
    """
    clear_cache()
    return {"message": "Cache successfully cleared"}


@app.post("/metrics/reset")
def reset_all_metrics():
    """
    Resets accumulated metrics.
    """
    reset_metrics()
    return {"message": "Metrics successfully reset"}