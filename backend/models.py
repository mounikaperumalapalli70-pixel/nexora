"""
LLM Provider Integration & Smart Fallback Engine for NEXORA
Supports multi-provider execution (OpenRouter, Groq, OpenAI, Google Gemini, Ollama),
live provider health inspection, zero mock data, and user-friendly error formatting.
"""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
from dotenv import load_dotenv

# Reliably load backend/.env using explicit path
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


def _mask_key(key: str) -> str:
    """Masks an API key for safe frontend display, e.g. 'sk-or-••••••••4fce'."""
    if not key:
        return ""
    key = key.strip()
    if len(key) <= 8:
        return "••••••••"
    return f"{key[:6]}••••••••{key[-4:]}"


def get_providers_status() -> Dict[str, Any]:
    """
    Returns live health & configuration status for all supported providers.
    Never exposes raw secrets to the caller.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()

    # 1. OpenRouter Status
    openrouter_status = "not_configured"
    if openrouter_key:
        openrouter_status = "connected"

    # 2. Groq Status
    groq_status = "not_configured"
    if groq_key:
        groq_status = "connected"

    # 3. OpenAI Status
    openai_status = "not_configured"
    if openai_key:
        openai_status = "connected"

    # 4. Google Gemini Status
    gemini_status = "not_configured"
    if gemini_key:
        gemini_status = "connected"

    # 5. Ollama Local Neural Status (Fast Probe with 1.5s timeout)
    ollama_status = "offline"
    ollama_models = []
    try:
        r = requests.get("http://127.0.0.1:11434/api/tags", timeout=(1.5, 1.5))
        if r.status_code == 200:
            ollama_status = "online"
            tags = r.json().get("models", [])
            ollama_models = [m.get("name") for m in tags]
    except Exception:
        ollama_status = "offline"

    return {
        "openrouter": {
            "name": "OpenRouter",
            "type": "cloud",
            "configured": bool(openrouter_key),
            "status": openrouter_status,
            "masked_key": _mask_key(openrouter_key),
            "models": "Meta Llama 3, Claude 3, Mistral, Qwen"
        },
        "groq": {
            "name": "Groq",
            "type": "cloud",
            "configured": bool(groq_key),
            "status": groq_status,
            "masked_key": _mask_key(groq_key),
            "models": "Llama 3.3 70B, Llama 3.1 8B Instant"
        },
        "openai": {
            "name": "OpenAI",
            "type": "cloud",
            "configured": bool(openai_key),
            "status": openai_status,
            "masked_key": _mask_key(openai_key),
            "models": "GPT-4o, GPT-4o-mini, GPT-3.5"
        },
        "gemini": {
            "name": "Google Gemini",
            "type": "cloud",
            "configured": bool(gemini_key),
            "status": gemini_status,
            "masked_key": _mask_key(gemini_key),
            "models": "Gemini 1.5 Flash, Gemini 1.5 Pro"
        },
        "ollama": {
            "name": "Ollama (Local Engine)",
            "type": "local",
            "configured": True,
            "status": ollama_status,
            "models": ", ".join(ollama_models[:3]) if ollama_models else "qwen3:1.7b, llama3 (optional)"
        }
    }


def _prepare_messages_payload(
    message: str,
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> List[Dict[str, str]]:
    """
    Builds a normalized message sequence:
    [{"role": "system", "content": ...}, ...history..., {"role": "user", "content": message}]
    """
    if messages_override:
        return messages_override

    msgs: List[Dict[str, str]] = []
    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})

    if history:
        for turn in history:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ["user", "human"]:
                msgs.append({"role": "user", "content": content})
            elif role in ["assistant", "ai", "nexora", "bot"]:
                msgs.append({"role": "assistant", "content": content})
            elif role == "system":
                msgs.append({"role": "system", "content": content})
            else:
                msgs.append({"role": "user", "content": content})

    msgs.append({"role": "user", "content": message})
    return msgs


def call_openrouter(
    message: str,
    model: str,
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> dict:
    """
    Calls OpenRouter chat completions API with multi-turn context.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return {"success": False, "error": "OPENROUTER_API_KEY is not configured"}

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "NEXORA AI Optimizer"
    }

    messages = _prepare_messages_payload(message, system_prompt, history, messages_override)
    payload = {
        "model": model,
        "messages": messages
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=35)
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                content = choices[0]["message"].get("content", "")
                usage = data.get("usage", {})
                return {
                    "success": True,
                    "answer": content,
                    "usage": usage,
                    "provider": "OpenRouter",
                    "model_used": model
                }

        err_detail = f"HTTP {response.status_code}"
        try:
            err_json = response.json()
            if "error" in err_json:
                err_detail += f" - {err_json['error'].get('message', str(err_json['error']))}"
        except Exception:
            pass
        return {"success": False, "error": err_detail}

    except requests.exceptions.Timeout:
        return {"success": False, "error": "OpenRouter timeout"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"OpenRouter connection error: {str(e)}"}


def call_groq(
    message: str,
    model: str,
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> dict:
    """
    Calls Groq cloud completions API with ultra-low latency.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return {"success": False, "error": "GROQ_API_KEY is not configured"}

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    groq_model_map = {
        "cheap": "llama-3.1-8b-instant",
        "easy": "llama-3.1-8b-instant",
        "normal": "llama-3.3-70b-versatile",
        "medium": "llama-3.3-70b-versatile",
        "powerful": "llama-3.3-70b-versatile",
        "hard": "llama-3.3-70b-versatile"
    }
    selected_model = groq_model_map.get(model.lower(), "llama-3.3-70b-versatile")
    if "/" in model:
        selected_model = "llama-3.3-70b-versatile"

    messages = _prepare_messages_payload(message, system_prompt, history, messages_override)

    try:
        response = requests.post(
            url,
            headers=headers,
            json={"model": selected_model, "messages": messages},
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                content = choices[0]["message"].get("content", "")
                usage = data.get("usage", {})
                return {
                    "success": True,
                    "answer": content,
                    "usage": usage,
                    "provider": "Groq",
                    "model_used": selected_model
                }
        return {"success": False, "error": f"Groq HTTP {response.status_code}: {response.text[:180]}"}
    except Exception as e:
        return {"success": False, "error": f"Groq error: {str(e)}"}


def call_openai(
    message: str,
    model: str,
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> dict:
    """
    Calls OpenAI completions API.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return {"success": False, "error": "OPENAI_API_KEY is not configured"}

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    if "mini" in model.lower() or "3.5" in model.lower() or "easy" in model.lower() or "cheap" in model.lower() or "medium" in model.lower():
        openai_model = "gpt-4o-mini"
    else:
        openai_model = "gpt-4o"

    messages = _prepare_messages_payload(message, system_prompt, history, messages_override)

    try:
        response = requests.post(
            url,
            headers=headers,
            json={"model": openai_model, "messages": messages},
            timeout=35
        )
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                content = choices[0]["message"].get("content", "")
                usage = data.get("usage", {})
                return {
                    "success": True,
                    "answer": content,
                    "usage": usage,
                    "provider": "OpenAI",
                    "model_used": openai_model
                }
        return {"success": False, "error": f"OpenAI HTTP {response.status_code}: {response.text[:180]}"}
    except Exception as e:
        return {"success": False, "error": f"OpenAI error: {str(e)}"}


def call_gemini(
    message: str,
    model: str,
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> dict:
    """
    Calls Google Gemini API with multi-turn support.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return {"success": False, "error": "GEMINI_API_KEY is not configured"}

    gemini_model = "gemini-1.5-flash" if "flash" in model.lower() or "cheap" in model.lower() or "easy" in model.lower() or "mini" in model.lower() or "medium" in model.lower() else "gemini-1.5-pro"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}

    contents = []
    sys_instruction = None
    if system_prompt:
        sys_instruction = {"parts": [{"text": system_prompt}]}

    if history:
        for turn in history:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            g_role = "user" if role in ["user", "human"] else "model"
            contents.append({
                "role": g_role,
                "parts": [{"text": content}]
            })

    contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })

    payload: Dict[str, Any] = {"contents": contents}
    if sys_instruction:
        payload["systemInstruction"] = sys_instruction

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=35)
        if response.status_code == 200:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    content = parts[0]["text"]
                    usage_meta = data.get("usageMetadata", {})
                    usage = {
                        "prompt_tokens": usage_meta.get("promptTokenCount", 0),
                        "completion_tokens": usage_meta.get("candidatesTokenCount", 0),
                        "total_tokens": usage_meta.get("totalTokenCount", 0)
                    }
                    return {
                        "success": True,
                        "answer": content,
                        "usage": usage,
                        "provider": "Google Gemini",
                        "model_used": gemini_model
                    }
        return {"success": False, "error": f"Gemini HTTP {response.status_code}: {response.text[:180]}"}
    except Exception as e:
        return {"success": False, "error": f"Gemini error: {str(e)}"}


def call_ollama(
    message: str,
    model: str = "",
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> dict:
    """
    Calls local Ollama neural engine on http://127.0.0.1:11434 with quick 2s connect timeout.
    Treats Ollama as an optional offline provider if not active.
    """
    try:
        url = "http://127.0.0.1:11434/api/chat"
        messages = _prepare_messages_payload(message, system_prompt, history, messages_override)
        local_model = "qwen3:1.7b"

        payload = {
            "model": local_model,
            "messages": messages,
            "stream": False
        }
        # Connect timeout: 2.0s, read timeout: 45s
        res = requests.post(url, json=payload, timeout=(2.0, 45.0))
        if res.status_code == 200:
            data = res.json()
            content = data.get("message", {}).get("content", "")
            eval_count = data.get("eval_count", 0)
            prompt_eval_count = data.get("prompt_eval_count", 0)
            return {
                "success": True,
                "answer": content,
                "usage": {
                    "prompt_tokens": prompt_eval_count,
                    "completion_tokens": eval_count,
                    "total_tokens": prompt_eval_count + eval_count
                },
                "provider": "Ollama (Local Engine)",
                "model_used": local_model
            }
        return {"success": False, "error": f"Ollama HTTP {res.status_code}"}
    except Exception as e:
        return {"success": False, "error": "Ollama is offline"}


def call_model(
    message: str,
    model: str,
    system_prompt: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    messages_override: Optional[List[Dict[str, str]]] = None
) -> dict:
    """
    Primary multi-provider model caller for NEXORA with Smart Fallback.
    Sequentially tests configured healthy providers.
    Returns structured user-friendly error if zero providers are available.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    errors = []

    # 1. Try Groq (Ultra-fast inference)
    if os.getenv("GROQ_API_KEY"):
        res = call_groq(message, model, system_prompt, history, messages_override)
        if res.get("success") and res.get("answer"):
            return res
        errors.append(f"Groq ({res.get('error', 'API error')})")

    # 2. Try OpenAI
    if os.getenv("OPENAI_API_KEY"):
        res = call_openai(message, model, system_prompt, history, messages_override)
        if res.get("success") and res.get("answer"):
            return res
        errors.append(f"OpenAI ({res.get('error', 'API error')})")

    # 3. Try Google Gemini
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        res = call_gemini(message, model, system_prompt, history, messages_override)
        if res.get("success") and res.get("answer"):
            return res
        errors.append(f"Gemini ({res.get('error', 'API error')})")

    # 4. Try OpenRouter
    if os.getenv("OPENROUTER_API_KEY"):
        res = call_openrouter(message, model, system_prompt, history, messages_override)
        if res.get("success") and res.get("answer"):
            return res
        errors.append(f"OpenRouter ({res.get('error', 'API error')})")

    # 5. Try local Ollama if active
    ollama_res = call_ollama(message, model, system_prompt, history, messages_override)
    if ollama_res.get("success") and ollama_res.get("answer"):
        return ollama_res
    if ollama_res.get("error") != "Ollama is offline":
        errors.append(f"Ollama ({ollama_res.get('error')})")

    # User-Friendly Error Formatting
    error_summary = "\n".join(errors) if errors else "No AI provider API keys found in backend/.env"
    
    friendly_answer = (
        "AI provider isn't configured yet.\n\n"
        "Connect an AI provider in **Settings → AI Providers** to start generating responses.\n\n"
        "<details><summary>🔍 Technical details</summary>\n\n"
        f"```\n{error_summary}\n```\n"
        "</details>"
    )

    return {
        "success": False,
        "is_configuration_error": True,
        "title": "AI provider isn't configured yet.",
        "subtitle": "Connect an AI provider in Settings to start generating responses.",
        "action_label": "Open AI Settings",
        "answer": friendly_answer,
        "technical_details": error_summary,
        "usage": {},
        "error": error_summary
    }