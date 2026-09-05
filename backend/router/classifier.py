"""
Difficulty Classifier for NEXORA
Classifies user queries into difficulty tiers (easy, medium, hard) and provides routing rationale.
"""

def classify_request(message: str) -> str:
    """
    Returns 'easy', 'medium', or 'hard' based on text complexity and keyword analysis.
    """
    text = message.lower().strip()

    # HARD requests (System design, distributed architectures, mathematical proofs, deep analysis)
    hard_keywords = [
        "design an architecture",
        "system design",
        "distributed",
        "complex algorithm",
        "research paper",
        "deep analysis",
        "compare in detail",
        "mathematical proof",
        "prove that",
        "debug this complex",
        "distributed architecture",
        "concurrency",
        "microservices architecture",
        "fault tolerance",
        "consensus algorithm",
        "paxos",
        "raft",
    ]

    # MEDIUM requests (Coding, implementation, structured explanations, comparison)
    medium_keywords = [
        "write code",
        "python code",
        "python function",
        "javascript",
        "implement",
        "binary search",
        "create a function",
        "explain with example",
        "analyze",
        "compare llm",
        "compare models",
        "algorithm",
        "sql query",
        "rest api",
        "write a script",
    ]

    for keyword in hard_keywords:
        if keyword in text:
            return "hard"

    for keyword in medium_keywords:
        if keyword in text:
            return "medium"

    # Word count heuristics
    words = text.split()
    if len(words) <= 14:
        return "easy"

    if len(words) > 40:
        return "hard"

    return "medium"


def get_classification_reason(difficulty: str, message: str) -> str:
    """
    Returns a human-readable explanation of why a query was routed to a particular tier.
    """
    text = message.lower()

    if difficulty == "easy":
        if any(w in text for w in ["what", "who", "when", "where", "capital", "translate", "simple"]):
            return "Simple factual or educational query"
        return "Short direct query with low compute requirements"

    elif difficulty == "medium":
        if any(w in text for w in ["python", "code", "function", "implement", "binary search", "script"]):
            return "Moderate coding or algorithmic implementation task"
        if "compare" in text or "analyze" in text:
            return "Structured comparison & multi-faceted explanation"
        return "Standard request requiring balanced reasoning and synthesis"

    else: # hard
        if "design" in text or "architecture" in text or "distributed" in text:
            return "Complex multi-step system design and architecture"
        if "proof" in text or "prove" in text or "math" in text:
            return "Formal logical or mathematical reasoning required"
        return "High-complexity request requiring maximum model depth and context"