# Google OAuth 2.0 Setup Guide for NEXORA

Follow these simple steps to configure real Google Authentication for NEXORA using Google Cloud Console.

---

## 1. Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name your project **`NEXORA`** and click **Create**.

---

## 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services** &rarr; **OAuth consent screen** (or [click here](https://console.cloud.google.com/apis/credentials/consent)).
2. Select **External** and click **Create**.
3. Fill in the required fields:
   - **App name**: `NEXORA`
   - **User support email**: Your Google email
   - **Developer contact information**: Your Google email
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes**, check:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Click **Update** &rarr; **Save and Continue**.
7. Under **Test users**, click **Add Users** and add your own Google email address (e.g. your Gmail account).
8. Click **Save and Continue**.

---

## 3. Create OAuth 2.0 Client ID Credentials
1. Navigate to **APIs & Services** &rarr; **Credentials** (or [click here](https://console.cloud.google.com/apis/credentials)).
2. Click **+ Create Credentials** &rarr; **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Set **Name** to `NEXORA Web Client`.
5. Under **Authorized JavaScript origins**, click **+ Add URI** and add:
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`
6. Under **Authorized redirect URIs**, click **+ Add URI** and add:
   - `http://localhost:8000/auth/google/callback`
   - `http://127.0.0.1:8000/auth/google/callback`
7. Click **Create**.

---

## 4. Update Your `.env` File
Copy your generated **Client ID** and **Client Secret** into `backend/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
SESSION_SECRET_KEY=nexora_super_secret_session_key_2026
```

---

## 5. Start NEXORA and Test Real Google Login
1. Start the FastAPI backend:
   ```powershell
   cd backend
   .\venv\Scripts\uvicorn.exe main:app --reload
   ```
2. Open **`http://localhost:8000/dashboard/`** or **`http://127.0.0.1:8000/dashboard/`**.
3. Click **Continue with Google**.
4. The official Google account chooser opens. Select your Google account.
5. Google authenticates you and opens the NEXORA dashboard displaying your **real Google name, email, and avatar**!
