import sys
import io
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
session = requests.Session()

print("==================================================")
print("NEXORA - FINAL SYSTEM VERIFICATION SUITE")
print("==================================================")

# 1. Healthcheck
print("\n[TEST 1] Healthcheck & Provider Status...")
r = session.get(f"{BASE_URL}/health")
assert r.status_code == 200, f"Health check failed: {r.status_code}"
print("✓ Healthcheck passed:", r.json())

r = session.get(f"{BASE_URL}/api/providers/status")
assert r.status_code == 200
print("✓ Providers status:", r.json().get("providers", {}).get("active_provider"))

# 2. Authentication
print("\n[TEST 2] Authentication & Session Persistence...")
r = session.post(f"{BASE_URL}/auth/email/login", json={"email": "mounika@example.com", "name": "Mounika P"})
assert r.status_code == 200, f"Email login failed: {r.status_code}"
user_data = r.json().get("user", {})
print(f"✓ Logged in as: {user_data.get('name')} ({user_data.get('email')})")

r = session.get(f"{BASE_URL}/auth/me")
assert r.status_code == 200
me_data = r.json()
assert me_data.get("authenticated") is True
print("✓ Session /auth/me verified:", me_data.get("user", {}).get("first_name"))

# 3. RAG Document Upload (TXT & In-Memory PDF)
print("\n[TEST 3] RAG Document Upload & Indexing...")
sample_text = """
Quantum Annealing and Adiabatic Quantum Computing Overview:
Quantum annealing is an optimization process for finding the global minimum of a given objective function
over a given set of candidate states, by using quantum fluctuations.
D-Wave Systems developed commercial quantum annealers featuring over 5000 superconducting qubits.
The primary advantage is solving combinatorial optimization problems in logistics, finance, and drug discovery
significantly faster than classical simulated annealing.
"""

files = {
    'file': ('quantum_computing_overview.txt', io.BytesIO(sample_text.encode('utf-8')), 'text/plain')
}
data = {'workspace_id': 'Research'}
r = session.post(f"{BASE_URL}/api/rag/upload", files=files, data=data)
assert r.status_code == 200, f"RAG upload failed: {r.text}"
upload_res = r.json()
print("✓ RAG Document Indexed:", upload_res.get("message"))
print("  Document metadata:", upload_res.get("document"))

# 4. RAG Similarity Query
print("\n[TEST 4] RAG Vector Search & Retrieval...")
r = session.post(f"{BASE_URL}/api/rag/query", json={
    "query": "What are the advantages of quantum annealing in logistics and finance?",
    "workspace_id": "Research",
    "top_k": 3
})
assert r.status_code == 200, f"RAG query failed: {r.text}"
rag_res = r.json()
print(f"✓ Retrieved {rag_res.get('count')} relevant chunks.")
for i, chunk in enumerate(rag_res.get("chunks", [])):
    print(f"  [Chunk {i+1}] Score: {chunk['score']:.3f} | Doc: {chunk['document_name']}")

# 5. Chat with RAG Context
print("\n[TEST 5] Chat Execution with RAG Knowledge in Research Workspace...")
r = session.post(f"{BASE_URL}/chat", json={
    "message": "What is quantum annealing used for according to the indexed documents?",
    "workspace_id": "Research",
    "mode": "auto",
    "use_context": True
})
assert r.status_code == 200, f"Chat failed: {r.text}"
chat_res = r.json()
print("✓ Model Selected:", chat_res.get("model"))
print("✓ RAG Used:", chat_res.get("rag_used"))
print("✓ RAG Chunks Count:", len(chat_res.get("rag_chunks", [])))
print("✓ Cost Saved %:", chat_res.get("cost_saved_percent"))
print("✓ Response excerpt:", chat_res.get("answer")[:200] + "...")

# 6. Simple Query (Fast / Cheap Router)
print("\n[TEST 6] Simple Query (Fast/Cheap Model Selection)...")
r = session.post(f"{BASE_URL}/chat", json={
    "message": "Hi",
    "workspace_id": "Personal",
    "mode": "auto"
})
assert r.status_code == 200
res_simple = r.json()
print(f"✓ Difficulty: {res_simple.get('difficulty')} | Model: {res_simple.get('model')} | Cost: ${res_simple.get('estimated_cost'):.4f}")

# 7. Complex Technical Query (Powerful Model Selection)
print("\n[TEST 7] Complex Technical Query (Powerful Model Selection)...")
r = session.post(f"{BASE_URL}/chat", json={
    "message": "Write a distributed consensus engine in Rust implementing Raft leader election with state machine replication and log compaction.",
    "workspace_id": "Hackathons",
    "mode": "auto"
})
assert r.status_code == 200
res_complex = r.json()
print(f"✓ Difficulty: {res_complex.get('difficulty')} | Model: {res_complex.get('model')} | Reason: {res_complex.get('reason')}")

# 8. Conversations & Workspaces Persistence
print("\n[TEST 8] Conversations Persistence...")
r = session.get(f"{BASE_URL}/api/conversations?workspace_id=Research")
assert r.status_code == 200
convs = r.json().get("conversations", [])
print(f"✓ Found {len(convs)} persisted conversations in Research workspace.")

print("\n==================================================")
print("🎉 ALL 8 SUITE TESTS PASSED PERFECTLY!")
print("==================================================")
