"""
Google OAuth 2.0 & Email Authentication Module for NEXORA
Handles real Google identity verification, Email sign-in, user profile management, and session syncing.
"""

import os
from pathlib import Path
import urllib.parse
import requests
from typing import Optional
from dotenv import load_dotenv
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

from services.user_store import get_or_create_user, get_user, update_user_profile

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")


class TokenVerificationRequest(BaseModel):
    credential: str


class EmailLoginRequest(BaseModel):
    email: str
    name: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None


def _get_frontend_redirect_url(path: str = "/") -> str:
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend_url:
        return f"{frontend_url}{path}"
    return path


@router.get("/config")
def get_auth_config():
    """
    Returns the public Google Client ID for frontend GIS initialization.
    Never exposes secrets.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "").strip()
    }


@router.get("/google/login")
def google_login(request: Request):
    """
    Redirects the user to Google's official OAuth 2.0 account chooser.
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id or client_id.startswith("YOUR_GOOGLE"):
        return RedirectResponse(url=_get_frontend_redirect_url("/?auth_error=google_credentials_missing"))

    configured_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if configured_redirect_uri:
        redirect_uri = configured_redirect_uri
    else:
        host = request.headers.get("host", "localhost:8000")
        scheme = request.headers.get("x-forwarded-proto", "http")
        redirect_uri = f"{scheme}://{host}/auth/google/callback"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
        "access_type": "online"
    }

    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None)
):
    """
    Callback endpoint that receives Google's authorization code, exchanges it
    for tokens, verifies identity, and creates an authenticated backend session.
    """
    if error or not code:
        return RedirectResponse(url=_get_frontend_redirect_url("/?auth_error=cancelled"))

    load_dotenv(dotenv_path=ENV_PATH, override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    configured_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if configured_redirect_uri:
        redirect_uri = configured_redirect_uri
    else:
        host = request.headers.get("host", "localhost:8000")
        scheme = request.headers.get("x-forwarded-proto", "http")
        redirect_uri = f"{scheme}://{host}/auth/google/callback"

    token_url = "https://oauth2.googleapis.com/token"
    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }

    try:
        token_response = requests.post(token_url, data=token_payload, timeout=10)
        if token_response.status_code != 200:
            return RedirectResponse(url=_get_frontend_redirect_url("/?auth_error=token_exchange_failed"))

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        userinfo_headers = {"Authorization": f"Bearer {access_token}"}
        userinfo_response = requests.get(userinfo_url, headers=userinfo_headers, timeout=10)

        if userinfo_response.status_code != 200:
            return RedirectResponse(url=_get_frontend_redirect_url("/?auth_error=userinfo_fetch_failed"))

        user_info = userinfo_response.json()

        # Save to persistent user store
        user_name = user_info.get("name") or user_info.get("email", "").split("@")[0]
        user_email = user_info.get("email", "")
        user_picture = user_info.get("picture", "")
        user_id = user_info.get("id", "")

        user_record = get_or_create_user(
            email=user_email,
            name=user_name,
            picture=user_picture,
            provider="google",
            user_id_override=f"google_{user_id}" if user_id else None
        )

        request.session["user"] = user_record
        return RedirectResponse(url=_get_frontend_redirect_url("/?auth=success&first_login=1"))

    except requests.exceptions.RequestException:
        return RedirectResponse(url=_get_frontend_redirect_url("/?auth_error=network_error"))


@router.post("/google/token")
def verify_google_id_token(request: Request, payload: TokenVerificationRequest):
    """
    Verifies a Google ID token from Google Identity Services (GIS) button
    and establishes an authenticated session.
    """
    id_token = payload.credential
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing Google ID token")

    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    try:
        resp = requests.get(tokeninfo_url, timeout=10)
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google ID token")

        token_data = resp.json()
        user_name = token_data.get("name") or token_data.get("email", "").split("@")[0]
        user_email = token_data.get("email", "")
        user_picture = token_data.get("picture", "")
        user_id = token_data.get("sub", "")

        user_record = get_or_create_user(
            email=user_email,
            name=user_name,
            picture=user_picture,
            provider="google",
            user_id_override=f"google_{user_id}" if user_id else None
        )

        request.session["user"] = user_record
        return {
            "status": "authenticated",
            "user": user_record
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Google verification error: {str(e)}")


@router.post("/email/login")
def email_login(request: Request, payload: EmailLoginRequest):
    """
    Email authentication endpoint.
    Derives friendly name, creates or loads persistent user record, and establishes session.
    """
    email = payload.email.strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    user_record = get_or_create_user(
        email=email,
        name=payload.name,
        provider="email"
    )

    request.session["user"] = user_record
    return {
        "status": "authenticated",
        "user": user_record
    }


@router.get("/me")
def get_current_user(request: Request):
    """
    Returns the currently authenticated user from backend session & user store.
    """
    session_user = request.session.get("user")
    if session_user and isinstance(session_user, dict) and "email" in session_user:
        # Refresh from persistent user store
        db_user = get_user(session_user.get("id") or session_user.get("email"))
        user_data = db_user or session_user
        return {
            "authenticated": True,
            "user": user_data
        }
    return {
        "authenticated": False,
        "user": None
    }


@router.post("/profile/update")
def update_profile(request: Request, payload: ProfileUpdateRequest):
    """
    Updates authenticated user's display name or avatar.
    """
    session_user = request.session.get("user")
    if not session_user or not isinstance(session_user, dict) or "id" not in session_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    uid = session_user["id"]
    updated = update_user_profile(uid, {"name": payload.name, "picture": payload.picture})
    if not updated:
        raise HTTPException(status_code=404, detail="User profile not found")

    request.session["user"] = updated
    return {
        "status": "success",
        "user": updated
    }


@router.post("/logout")
@router.get("/logout")
def logout(request: Request):
    """
    Destroys the user session and clears authentication state.
    """
    request.session.clear()
    return {"status": "logged_out", "message": "Successfully logged out"}
