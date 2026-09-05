# 🚀 NEXORA Production Deployment Guide

This guide provides step-by-step instructions for deploying the **NEXORA - AI Optimization Engine** to production with **Vercel** (Frontend) and **Render / Railway** (FastAPI Backend).

---

## 🏗 Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              Google Cloud Console            │
                        │        (OAuth 2.0 Identity Provider)         │
                        └──────────────┬───────────────────────────────┘
                                       │
                                       │ OAuth Verification
                                       ▼
┌──────────────────────────────┐                ┌──────────────────────────────┐
│       Vercel (Frontend)      │ ──REST APIs──► │    Render / Railway (Backend)│
│   https://nexora.vercel.app  │ ◄──Session───  │ https://nexora-api.onrender  │
│   • Vanilla SPA (HTML/JS/CSS)│   Credentials  │ • FastAPI + Uvicorn ASGI     │
│   • Three.js 3D Visualizer   │                │ • Multi-Provider Model Router│
│   • In-Composer Mode Switch  │                │ • User & Conversation Store  │
└──────────────────────────────┘                └──────────────┬───────────────┘
                                                               │
                                                               ▼
                                                ┌──────────────────────────────┐
                                                │      AI Cloud Providers      │
                                                │ Groq • OpenRouter • OpenAI   │
                                                │ Google Gemini • Ollama       │
                                                └──────────────────────────────┘
```

---

## 1. 🌐 Frontend Deployment (Vercel)

### Option A: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy directly from repository root
vercel
```

### Option B: Via Vercel Web Dashboard (Git Integration)
1. Push your repository to **GitHub / GitLab**.
2. Log in to [Vercel Dashboard](https://vercel.com) and click **"Add New..." → "Project"**.
3. Import your **nexora** repository.
4. Configure Project Settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (or `frontend`)
   - **Build Command**: Leave empty (static SPA)
   - **Output Directory**: `frontend` (if root directory is `./`)
5. If your backend is deployed at `https://nexora-api.onrender.com`, configure the backend URL in `frontend/index.html` or inject:
   ```html
   <script>
     window.NEXORA_API_URL = "https://your-nexora-backend.onrender.com";
   </script>
   ```
6. Click **Deploy**.

---

## 2. ⚡ Backend Deployment (Render / Railway)

### Deploying to Render:
1. Log in to [Render](https://render.com) and click **"New +" → "Web Service"**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `nexora-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables** (see checklist below).
5. Click **Create Web Service**.

### Deploying to Railway:
1. Log in to [Railway](https://railway.app) and click **"New Project" → "Deploy from GitHub repo"**.
2. In service settings, set **Root Directory** to `/backend`.
3. Add the required environment variables.
4. Railway automatically detects `Procfile` and launches `uvicorn main:app --host 0.0.0.0 --port $PORT`.

---

## 3. 🔐 Google OAuth 2.0 Production Setup

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID (Web Application).
3. Under **Authorized JavaScript Origins**, add:
   - `http://localhost:8000` (Local testing)
   - `https://your-nexora-app.vercel.app` (Your Vercel domain)
4. Under **Authorized Redirect URIs**, add:
   - `http://localhost:8000/auth/google/callback` (Local testing)
   - `https://your-nexora-api.onrender.com/auth/google/callback` (Your Render/Railway backend callback URL)
5. Save changes in Google Cloud Console.

---

## 4. 📋 Environment Variables Checklist

Set these variables in your backend hosting dashboard (**Render / Railway / .env**):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Application mode (`development` or `production`) | `production` |
| `SESSION_SECRET_KEY` | 32+ char random key for session cookie encryption | `b8f9e21...random_key` |
| `FRONTEND_URL` | Deployed Vercel frontend URL | `https://nexora.vercel.app` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed domains | `https://nexora.vercel.app,http://localhost:8000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `20915...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback endpoint | `https://nexora-api.onrender.com/auth/google/callback` |
| `OPENROUTER_API_KEY` | OpenRouter API key *(optional)* | `sk-or-v1-...` |
| `GROQ_API_KEY` | Groq cloud API key *(optional)* | `gsk_...` |
| `OPENAI_API_KEY` | OpenAI API key *(optional)* | `sk-proj-...` |
| `GEMINI_API_KEY` | Google Gemini API key *(optional)* | `AIzaSy...` |

---

## 5. 🗄 Database & Persistence Roadmap

### Current Architecture:
- User records, conversations, workspaces, and prompts are saved atomically to `backend/data/*.json` with thread safety.

### Production Scaling:
- **Free Cloud Containers (Render/Railway)**: Ephemeral instances wipe local files when spinning down. For persistent multi-user production data, we recommend:
  1. **Render Persistent Disk**: Attach a `/backend/data` disk mount in Render service settings.
  2. **PostgreSQL Migration (Recommended for High Scale)**:
     - Connect to a managed PostgreSQL (Supabase / Neon / Railway PostgreSQL).
     - Map `user_store`, `conversation_store`, and `workspace_store` to SQL tables using SQLAlchemy or SQLModel.

---

## 6. ✅ Post-Deployment Verification Checklist

1. [ ] **Unauthenticated Access**: Visiting the frontend loads **Screen 1 (Login)** and blocks access to the dashboard.
2. [ ] **Google OAuth**: Clicking **Continue with Google** opens Google's official consent chooser and redirects back without errors.
3. [ ] **Loading Sequence**: Step-by-step progress checklist (Connecting → Profile → Workspace → Conversations → Almost there) executes cleanly.
4. [ ] **Dynamic Greeting**: Dashboard displays `Good to see you again, {First Name}!` using the real Google/Email profile name.
5. [ ] **In-Composer Model Modes**: **FAST**, **PRO**, and **AUTO ROUTER** buttons properly dispatch queries to configured AI providers.
6. [ ] **Multi-Turn Context**: Follow-up questions maintain memory of previous turns in the conversation.
7. [ ] **Session Persistence**: Refreshing the browser preserves the active user session without asking for login again.
8. [ ] **Logout**: Signing out destroys the session and immediately redirects to the Login screen.
