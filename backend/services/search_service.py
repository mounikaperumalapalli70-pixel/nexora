"""
Search Service for NEXORA
Provides instant DuckDuckGo search summaries when live web information is requested.
"""

import urllib.parse
import requests


def search_ddg(query: str) -> str:
    """
    Fetches real live search snippets and abstract text from DuckDuckGo API.
    """
    try:
        url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1&skip_disambig=1"
        res = requests.get(url, timeout=8)
        if res.status_code == 200:
            data = res.json()
            abstract = data.get("AbstractText", "")
            heading = data.get("Heading", "")
            related = [t.get("Text") for t in data.get("RelatedTopics", []) if isinstance(t, dict) and "Text" in t]
            results = []
            if abstract:
                results.append(f"Summary ({heading}): {abstract}")
            if related:
                for item in related[:3]:
                    results.append(f"- {item}")
            return "\n".join(results)
    except Exception as e:
        print(f"[NEXORA Search Service] Search error: {e}")
    return ""
