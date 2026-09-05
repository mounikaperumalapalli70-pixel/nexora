import requests

s = requests.Session()

# 1. Check unauthenticated /auth/me
r0 = s.get('http://127.0.0.1:8000/auth/me')
print('1. Unauthenticated /auth/me:', r0.json())

# 2. Login with email
r1 = s.post('http://127.0.0.1:8000/auth/email/login', json={'email': 'mounika@gmail.com', 'name': 'Mounika'})
print('2. Login response:', r1.json())

# 3. Check authenticated /auth/me
r2 = s.get('http://127.0.0.1:8000/auth/me')
print('3. Authenticated /auth/me:', r2.json())

# 4. Check workspaces
r3 = s.get('http://127.0.0.1:8000/api/workspaces')
print('4. Workspaces:', [w['name'] for w in r3.json().get('workspaces', [])])

# 5. Check prompts
r4 = s.get('http://127.0.0.1:8000/api/prompts')
print('5. Prompts count:', len(r4.json().get('prompts', [])))

# 6. Check providers status
r8 = s.get('http://127.0.0.1:8000/api/providers/status')
print('6. Providers status:', {k: v['status'] for k, v in r8.json().get('providers', {}).items()})
