"""
Cost Tracker Service for NEXORA
Estimates token usage and computes financial metrics comparing routed models vs. baseline expensive models.
"""
import math
from typing import Dict, Any, Optional


def estimate_tokens(text: str) -> int:
    """
    Approximates token count based on typical character length (~4 characters per token).
    Minimum of 1 token for non-empty text.
    """
    if not text:
        return 0
    return max(1, math.ceil(len(text) / 4))


def calculate_request_cost(
    prompt: str,
    response: str,
    selected_model_info: Dict[str, Any],
    baseline_model_info: Dict[str, Any],
    cache_hit: bool = False,
    exact_usage: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculates the financial cost of a request for both the routed model
    and the baseline model, along with savings and savings percentage.

    If cache_hit is True:
        routed_cost is $0.00 (cached response eliminates LLM inference cost)
    """
    if exact_usage and "prompt_tokens" in exact_usage and "completion_tokens" in exact_usage:
        input_tokens = exact_usage["prompt_tokens"]
        output_tokens = exact_usage["completion_tokens"]
    else:
        input_tokens = estimate_tokens(prompt)
        output_tokens = estimate_tokens(response)

    total_tokens = input_tokens + output_tokens

    # Baseline cost calculation (Always Expensive Model)
    baseline_input_price = baseline_model_info.get("estimated_input_cost", 0.0050)
    baseline_output_price = baseline_model_info.get("estimated_output_cost", 0.0150)
    baseline_cost = (
        (input_tokens / 1000.0) * baseline_input_price +
        (output_tokens / 1000.0) * baseline_output_price
    )

    if cache_hit:
        routed_cost = 0.0
    else:
        routed_input_price = selected_model_info.get("estimated_input_cost", 0.0010)
        routed_output_price = selected_model_info.get("estimated_output_cost", 0.0020)
        routed_cost = (
            (input_tokens / 1000.0) * routed_input_price +
            (output_tokens / 1000.0) * routed_output_price
        )

    savings = max(0.0, baseline_cost - routed_cost)
    savings_percentage = (savings / baseline_cost * 100.0) if baseline_cost > 0 else 0.0

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "routed_cost": round(routed_cost, 6),
        "baseline_cost": round(baseline_cost, 6),
        "savings": round(savings, 6),
        "savings_percentage": round(savings_percentage, 2)
    }
