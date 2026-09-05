"""
Metrics Tracking Service for NEXORA
Tracks real-time aggregate statistics for request volume, costs, savings, latencies, and cache hits.
"""
from typing import Dict, Any, List, Optional
import time

# Global in-memory metrics state
_METRICS_STATE: Dict[str, Any] = {
    "total_requests": 0,
    "easy_requests": 0,
    "medium_requests": 0,
    "hard_requests": 0,
    "total_cost": 0.0,
    "baseline_cost": 0.0,
    "total_savings": 0.0,
    "total_latency_ms": 0.0,
    "average_latency": 0.0,
    "cache_hits": 0,
    "cache_misses": 0,
    "average_quality": None,
    "quality_scores_sum": 0.0,
    "quality_scores_count": 0,
    "recent_requests": []  # Holds last 20 requests for dashboard visualization
}


def record_request(
    difficulty: str,
    cost: float,
    baseline_cost: float,
    savings: float,
    latency_ms: float,
    cache_hit: bool,
    quality_score: Optional[float] = None,
    preview_prompt: str = "",
    selected_model: str = ""
) -> None:
    """
    Records the outcome of a single request into global metrics.
    """
    _METRICS_STATE["total_requests"] += 1

    # Difficulty counters
    diff_key = f"{difficulty.lower()}_requests"
    if diff_key in _METRICS_STATE:
        _METRICS_STATE[diff_key] += 1

    # Cost & savings accumulators
    _METRICS_STATE["total_cost"] += cost
    _METRICS_STATE["baseline_cost"] += baseline_cost
    _METRICS_STATE["total_savings"] += savings

    # Latency tracking
    _METRICS_STATE["total_latency_ms"] += latency_ms
    _METRICS_STATE["average_latency"] = round(
        _METRICS_STATE["total_latency_ms"] / _METRICS_STATE["total_requests"], 2
    )

    # Cache metrics
    if cache_hit:
        _METRICS_STATE["cache_hits"] += 1
    else:
        _METRICS_STATE["cache_misses"] += 1

    # Quality metrics (if provided)
    if quality_score is not None:
        _METRICS_STATE["quality_scores_sum"] += quality_score
        _METRICS_STATE["quality_scores_count"] += 1
        _METRICS_STATE["average_quality"] = round(
            _METRICS_STATE["quality_scores_sum"] / _METRICS_STATE["quality_scores_count"], 2
        )

    # Record brief event log for dashboard feed (keep last 20)
    event_entry = {
        "timestamp": time.time(),
        "prompt": (preview_prompt[:60] + "...") if len(preview_prompt) > 60 else preview_prompt,
        "difficulty": difficulty,
        "selected_model": selected_model,
        "cost": round(cost, 6),
        "baseline_cost": round(baseline_cost, 6),
        "savings": round(savings, 6),
        "latency_ms": round(latency_ms, 1),
        "cache_hit": cache_hit
    }
    _METRICS_STATE["recent_requests"].insert(0, event_entry)
    if len(_METRICS_STATE["recent_requests"]) > 20:
        _METRICS_STATE["recent_requests"].pop()


def get_metrics_summary() -> Dict[str, Any]:
    """
    Returns the aggregated metrics summary with calculated ratios.
    """
    total = _METRICS_STATE["total_requests"]
    hits = _METRICS_STATE["cache_hits"]
    misses = _METRICS_STATE["cache_misses"]
    total_cache_queries = hits + misses

    cache_hit_rate = round((hits / total_cache_queries * 100.0), 2) if total_cache_queries > 0 else 0.0
    savings_pct = (
        round((_METRICS_STATE["total_savings"] / _METRICS_STATE["baseline_cost"] * 100.0), 2)
        if _METRICS_STATE["baseline_cost"] > 0 else 0.0
    )

    return {
        "total_requests": _METRICS_STATE["total_requests"],
        "easy_requests": _METRICS_STATE["easy_requests"],
        "medium_requests": _METRICS_STATE["medium_requests"],
        "hard_requests": _METRICS_STATE["hard_requests"],
        "total_cost": round(_METRICS_STATE["total_cost"], 6),
        "baseline_cost": round(_METRICS_STATE["baseline_cost"], 6),
        "total_savings": round(_METRICS_STATE["total_savings"], 6),
        "savings_percentage": savings_pct,
        "average_latency": _METRICS_STATE["average_latency"],
        "cache_hits": _METRICS_STATE["cache_hits"],
        "cache_misses": _METRICS_STATE["cache_misses"],
        "cache_hit_rate": cache_hit_rate,
        "average_quality": _METRICS_STATE["average_quality"],
        "recent_requests": list(_METRICS_STATE["recent_requests"])
    }


def reset_metrics() -> None:
    """
    Resets all metrics counters to zero.
    """
    _METRICS_STATE["total_requests"] = 0
    _METRICS_STATE["easy_requests"] = 0
    _METRICS_STATE["medium_requests"] = 0
    _METRICS_STATE["hard_requests"] = 0
    _METRICS_STATE["total_cost"] = 0.0
    _METRICS_STATE["baseline_cost"] = 0.0
    _METRICS_STATE["total_savings"] = 0.0
    _METRICS_STATE["total_latency_ms"] = 0.0
    _METRICS_STATE["average_latency"] = 0.0
    _METRICS_STATE["cache_hits"] = 0
    _METRICS_STATE["cache_misses"] = 0
    _METRICS_STATE["average_quality"] = None
    _METRICS_STATE["quality_scores_sum"] = 0.0
    _METRICS_STATE["quality_scores_count"] = 0
    _METRICS_STATE["recent_requests"].clear()
