import requests

BASE = "http://127.0.0.1:8000"

def run_tests():
    print("--- 1. Testing Unauthenticated State ---")
    s = requests.Session()
    r = s.get(f"{BASE}/auth/me")
    assert r.status_code == 200, f"Status {r.status_code}"
    me = r.json()
    assert me["authenticated"] is False, "Should be unauthenticated"
    assert me["user"] is None, "User should be None"
    print("PASS: Unauthenticated state correctly returns authenticated=False")

    print("\n--- 2. Testing Email Sign-In (Charan Teja) ---")
    r = s.post(f"{BASE}/auth/email/login", json={"email": "charan@gmail.com", "name": "Charan Teja"})
    assert r.status_code == 200, f"Status {r.status_code}"
    user_data = r.json()["user"]
    assert user_data["name"] == "Charan Teja"
    assert user_data["first_name"] == "Charan"
    print(f"PASS: Signed in as {user_data['name']}, First name: {user_data['first_name']}")

    print("\n--- 3. Testing Session Persistence for Charan ---")
    r = s.get(f"{BASE}/auth/me")
    assert r.status_code == 200
    me = r.json()
    assert me["authenticated"] is True
    assert me["user"]["first_name"] == "Charan"
    print("PASS: Session restored, authenticated=True, user=Charan")

    print("\n--- 4. Testing Conversation Creation & Scoping for Charan ---")
    chat_res = s.post(f"{BASE}/api/chat", json={
        "message": "Hello Nexora, remember my favorite color is Blue.",
        "mode": "fast",
        "workspace_id": "Personal"
    })
    assert chat_res.status_code == 200
    conv_id = chat_res.json()["conversation_id"]
    print(f"PASS: Created conversation {conv_id} for user Charan")

    # Multi-turn context test
    chat_res2 = s.post(f"{BASE}/api/chat", json={
        "message": "What is my favorite color?",
        "conversation_id": conv_id,
        "mode": "fast",
        "use_context": True,
        "workspace_id": "Personal"
    })
    assert chat_res2.status_code == 200
    answer_preview = chat_res2.json()["answer"][:90].replace("\n", " ").encode("ascii", "replace").decode("ascii")
    print(f"PASS: Multi-turn response: {answer_preview}...")

    print("\n--- 5. Testing Logout ---")
    logout_res = s.post(f"{BASE}/auth/logout")
    assert logout_res.status_code == 200
    r = s.get(f"{BASE}/auth/me")
    assert r.json()["authenticated"] is False
    print("PASS: Logged out successfully")

    print("\n--- 6. Testing Second User (Rahul Sharma) ---")
    r = s.post(f"{BASE}/auth/email/login", json={"email": "rahul.sharma@gmail.com", "name": "Rahul Sharma"})
    assert r.status_code == 200
    user_data = r.json()["user"]
    assert user_data["first_name"] == "Rahul"
    print(f"PASS: Signed in second user as {user_data['name']}, First name: {user_data['first_name']}")

    print("\n--- 7. Testing Third User Derived from Email (mounikapeturnallapalli70@gmail.com) ---")
    r = s.post(f"{BASE}/auth/email/login", json={"email": "mounikapeturnallapalli70@gmail.com"})
    assert r.status_code == 200
    user_data = r.json()["user"]
    assert "Mounika" in user_data["name"] or "Mounika" in user_data["first_name"]
    print(f"PASS: Derived user name: {user_data['name']}, First name: {user_data['first_name']}")

    print("\n=== ALL AUTH & SESSION TESTS PASSED! ===")

if __name__ == "__main__":
    run_tests()
