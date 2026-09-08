"""
Model Router Configuration for NEXORA
Routes queries to the cheapest suitable model based on classified difficulty.
"""

MODEL_CONFIG = {
    "easy": {
        "model": "google/gemma-4-26b-a4b-it:free",
        "name": "Haiku / Small (CHEAP)",
        "tier": "CHEAP",
        "description": "Ultra-low cost model for direct answers, definitions & simple facts",
        "estimated_input_cost": 0.0001,   # $ per 1k tokens
        "estimated_output_cost": 0.0002   # $ per 1k tokens
    },
    "medium": {
        "model": "openai/gpt-4o-mini",
        "name": "GPT-3.5 / Balanced (NORMAL)",
        "tier": "NORMAL",
        "description": "Cost-effective model for scripting, coding & standard explanations",
        "estimated_input_cost": 0.0010,   # $ per 1k tokens
        "estimated_output_cost": 0.0020   # $ per 1k tokens
    },
    "hard": {
        "model": "anthropic/claude-3.5-sonnet",
        "name": "GPT-4 / Claude (POWERFUL)",
        "tier": "POWERFUL",
        "description": "High-capacity model for system architecture, proofs & deep analysis",
        "estimated_input_cost": 0.0050,   # $ per 1k tokens
        "estimated_output_cost": 0.0150   # $ per 1k tokens
    }
}

# Baseline model representing the "Always Expensive Model" strategy
BASELINE_MODEL = {
    "model": "openai/gpt-4o",
    "name": "GPT-4 / Always-Expensive Baseline",
    "tier": "POWERFUL",
    "description": "Top-tier model used as the benchmark for unoptimized routing",
    "estimated_input_cost": 0.0050,       # $ per 1k tokens
    "estimated_output_cost": 0.0150       # $ per 1k tokens
}


def select_model(difficulty: str) -> dict:
    """
    Selects the cheapest model capable of handling the specified difficulty level.
    Defaults to medium if difficulty is unrecognized.
    """
    return MODEL_CONFIG.get(
        difficulty.lower(),
        MODEL_CONFIG["medium"]
    )


def get_baseline_model() -> dict:
    """
    Returns the baseline expensive model used for cost comparison.
    """
    return BASELINE_MODEL


def get_all_models() -> dict:
    """
    Returns the complete dictionary of supported models and configurations.
    """
    return MODEL_CONFIG
