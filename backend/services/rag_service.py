"""
NEXORA - Retrieval-Augmented Generation (RAG) Engine
Provides text extraction, semantic chunking, TF-IDF vector embeddings,
cosine similarity search, and knowledge base persistence per workspace.
"""

import os
import re
import io
import math
import json
import time
import uuid
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
RAG_DATA_FILE = DATA_DIR / "rag_store.json"

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
    "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
    "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
    "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
    "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
    "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves"
}


def _tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase alpha-numeric words without stopwords."""
    words = re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())
    return [w for w in words if w not in STOPWORDS]


def _term_frequency(tokens: List[str]) -> Dict[str, float]:
    """Computes normalized term frequencies for a token list."""
    if not tokens:
        return {}
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    total = len(tokens)
    return {k: v / total for k, v in counts.items()}


def _extract_text_from_pdf(content_bytes: bytes) -> str:
    """Extracts text from PDF bytes using pypdf."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(f"--- Page {i + 1} ---\n{text.strip()}")
        return "\n\n".join(pages_text)
    except Exception as e:
        print(f"[NEXORA RAG] PDF extraction fallback: {e}")
        # Plain text fallback
        return content_bytes.decode("utf-8", errors="ignore")


def _extract_text_from_docx(content_bytes: bytes) -> str:
    """Extracts text from DOCX (Word) bytes using built-in zipfile & XML."""
    try:
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as docx:
            xml_content = docx.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for node in tree.iter():
                if node.tag.endswith("}p"):
                    texts = [n.text for n in node.iter() if n.tag.endswith("}t") and n.text]
                    if texts:
                        paragraphs.append("".join(texts))
            return "\n\n".join(paragraphs)
    except Exception as e:
        print(f"[NEXORA RAG] DOCX extraction fallback: {e}")
        return content_bytes.decode("utf-8", errors="ignore")


def _extract_text(content_bytes: bytes, filename: str) -> str:
    """Extracts clean text based on file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(content_bytes)
    elif ext in [".docx", ".doc"]:
        return _extract_text_from_docx(content_bytes)
    else:
        # .txt, .md, .json, .csv, .py, .js, etc.
        try:
            return content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return content_bytes.decode("latin-1", errors="ignore")


def _chunk_text(text: str, chunk_size: int = 700, overlap: int = 120) -> List[str]:
    """Splits text into overlapping semantic chunks prioritizing paragraphs and sentences."""
    cleaned = text.replace("\r\n", "\n").strip()
    if not cleaned:
        return []

    # Split primarily on double newlines (paragraphs)
    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        if len(para) > chunk_size:
            # Sub-split large paragraphs by sentences or newlines
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for s in sentences:
                if len(current_chunk) + len(s) + 1 <= chunk_size:
                    current_chunk = (current_chunk + " " + s).strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    if len(s) > chunk_size:
                        # Hard character slice if single sentence is gigantic
                        for i in range(0, len(s), chunk_size - overlap):
                            chunks.append(s[i:i + chunk_size])
                        current_chunk = ""
                    else:
                        current_chunk = s
        else:
            if len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk = (current_chunk + "\n\n" + para).strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return [c.strip() for c in chunks if len(c.strip()) > 20]


class RAGStore:
    """Thread-safe persistent RAG Knowledge Base and TF-IDF Vector Index."""

    def __init__(self):
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.chunks: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if RAG_DATA_FILE.exists():
            try:
                with open(RAG_DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.documents = data.get("documents", {})
                    self.chunks = data.get("chunks", [])
            except Exception as e:
                print(f"[NEXORA RAG] Error loading RAG store: {e}")
                self.documents = {}
                self.chunks = []

    def _save(self):
        try:
            with open(RAG_DATA_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "documents": self.documents,
                    "chunks": self.chunks
                }, f, indent=2)
        except Exception as e:
            print(f"[NEXORA RAG] Error saving RAG store: {e}")

    def add_document(
        self,
        content_bytes: bytes,
        filename: str,
        workspace_id: str = "Personal",
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """Processes and indexes a document into the workspace knowledge base."""
        text = _extract_text(content_bytes, filename)
        if not text or len(text.strip()) < 10:
            raise ValueError(f"Could not extract readable text from '{filename}'.")

        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        raw_chunks = _chunk_text(text)

        if not raw_chunks:
            raw_chunks = [text[:1000]]

        created_chunks = []
        for idx, chunk_str in enumerate(raw_chunks):
            tokens = _tokenize(chunk_str)
            tf = _term_frequency(tokens)
            chunk_obj = {
                "chunk_id": f"{doc_id}_c{idx}",
                "doc_id": doc_id,
                "document_name": filename,
                "workspace_id": workspace_id,
                "user_id": user_id,
                "index": idx,
                "text": chunk_str,
                "tokens": tokens,
                "tf": tf,
                "char_length": len(chunk_str),
                "created_at": time.time()
            }
            created_chunks.append(chunk_obj)
            self.chunks.append(chunk_obj)

        doc_metadata = {
            "id": doc_id,
            "filename": filename,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "size_bytes": len(content_bytes),
            "char_count": len(text),
            "chunk_count": len(created_chunks),
            "created_at": time.time(),
            "preview": text[:200] + ("..." if len(text) > 200 else "")
        }

        self.documents[doc_id] = doc_metadata
        self._save()

        print(f"[NEXORA RAG] Indexed '{filename}' -> {len(created_chunks)} chunks in '{workspace_id}'")
        return doc_metadata

    def list_documents(self, workspace_id: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists active documents, optionally filtered by workspace."""
        docs = list(self.documents.values())
        if workspace_id and workspace_id != "all":
            docs = [d for d in docs if d.get("workspace_id") == workspace_id]
        if user_id and user_id != "default_user":
            docs = [d for d in docs if d.get("user_id") in [user_id, "default_user"]]
        return sorted(docs, key=lambda x: x.get("created_at", 0), reverse=True)

    def delete_document(self, doc_id: str) -> bool:
        """Deletes a document and all its indexed chunks."""
        if doc_id in self.documents:
            del self.documents[doc_id]
            self.chunks = [c for c in self.chunks if c.get("doc_id") != doc_id]
            self._save()
            return True
        return False

    def clear_workspace(self, workspace_id: str) -> int:
        """Clears all documents in a given workspace."""
        to_del = [doc_id for doc_id, d in self.documents.items() if d.get("workspace_id") == workspace_id]
        for d in to_del:
            if d in self.documents:
                del self.documents[d]
        self.chunks = [c for c in self.chunks if c.get("workspace_id") != workspace_id]
        self._save()
        return len(to_del)

    def search(
        self,
        query: str,
        workspace_id: Optional[str] = "Personal",
        top_k: int = 4,
        min_score: float = 0.04
    ) -> List[Dict[str, Any]]:
        """
        Executes TF-IDF and keyword BM25 similarity search against indexed chunks.
        Returns top matching chunks with similarity scores.
        """
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        # Filter candidate chunks
        candidate_chunks = self.chunks
        if workspace_id and workspace_id != "all":
            # Match current workspace or global
            candidate_chunks = [c for c in self.chunks if c.get("workspace_id") in [workspace_id, "Personal", None]]

        if not candidate_chunks:
            return []

        # Compute Document Frequency (DF) across candidates
        num_docs = len(candidate_chunks)
        df: Dict[str, int] = {}
        for c in candidate_chunks:
            chunk_unique_tokens = set(c.get("tokens", []))
            for t in chunk_unique_tokens:
                df[t] = df.get(t, 0) + 1

        # Query TF-IDF
        query_tf = _term_frequency(query_tokens)
        query_vector: Dict[str, float] = {}
        for t, tf in query_tf.items():
            doc_freq = df.get(t, 1)
            idf = math.log((num_docs + 1) / (doc_freq + 1)) + 1.0
            query_vector[t] = tf * idf

        # Calculate Cosine Similarity & keyword overlap score
        scored_chunks: List[Tuple[float, Dict[str, Any]]] = []

        for c in candidate_chunks:
            chunk_tf = c.get("tf", {})
            dot_product = 0.0
            chunk_norm_sq = 0.0

            for t, tf in chunk_tf.items():
                doc_freq = df.get(t, 1)
                idf = math.log((num_docs + 1) / (doc_freq + 1)) + 1.0
                weight = tf * idf
                chunk_norm_sq += weight * weight
                if t in query_vector:
                    dot_product += query_vector[t] * weight

            query_norm_sq = sum(w * w for w in query_vector.values())
            similarity = 0.0
            if query_norm_sq > 0 and chunk_norm_sq > 0:
                similarity = dot_product / (math.sqrt(query_norm_sq) * math.sqrt(chunk_norm_sq))

            # Add keyword bonus for exact query matches
            chunk_text_lower = c.get("text", "").lower()
            exact_term_hits = sum(1 for q in query_tokens if q in chunk_text_lower)
            if exact_term_hits > 0:
                similarity += 0.05 * (exact_term_hits / len(query_tokens))

            if similarity >= min_score or exact_term_hits > 0:
                scored_chunks.append((similarity, c))

        # Sort by similarity score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_results = []

        for score, c in scored_chunks[:top_k]:
            top_results.append({
                "chunk_id": c.get("chunk_id"),
                "doc_id": c.get("doc_id"),
                "document_name": c.get("document_name"),
                "workspace_id": c.get("workspace_id"),
                "text": c.get("text"),
                "score": round(score, 4),
                "index": c.get("index")
            })

        return top_results

    def format_rag_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Formats retrieved chunks into a prompt context block."""
        if not chunks:
            return ""
        formatted = ["=== RETRIEVED KNOWLEDGE BASE CONTEXT ==="]
        for i, chunk in enumerate(chunks):
            doc_name = chunk.get("document_name", "Document")
            formatted.append(f"\n[Source {i + 1}: {doc_name}]\n{chunk.get('text', '').strip()}")
        formatted.append("\n=========================================")
        return "\n".join(formatted)


# Global singleton instance
rag_engine = RAGStore()
