"""
NEXORA - Authentication
Google OAuth 2.0 + Email Login
"""

import os
import urllib.parse
import requests

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from services.user_store import (
    get_or_create_user,
    get_user,
    update_user_profile
)


# ============================================================
# ENVIRONMENT
# ============================================================

ENV_PATH = Path(__file__).resolve().parent / ".env"

load_dotenv(
    dotenv_path=ENV_PATH,
    override=True
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================
# CONFIG
# ============================================================

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    ""
).strip()

GOOGLE_CLIENT_SECRET = os.getenv(
    "GOOGLE_CLIENT_SECRET",
    ""
).strip()

GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "https://nexora-backend-gcjd.onrender.com/auth/google/callback"
).strip()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://nexora-sepia-psi.vercel.app"
).strip().rstrip("/")


# ============================================================
# MODELS
# ============================================================

class TokenVerificationRequest(BaseModel):
    credential: str


class EmailLoginRequest(BaseModel):
    email: str
    name: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None


# ============================================================
# FRONTEND REDIRECT
# ============================================================

def frontend_url(path: str = "/") -> str:

    return f"{FRONTEND_URL}{path}"


# ============================================================
# GOOGLE CONFIG
# ============================================================

@router.get("/config")
def get_auth_config():

    return {
        "google_client_id": GOOGLE_CLIENT_ID
    }


# ============================================================
# GOOGLE LOGIN
# ============================================================

@router.get("/google/login")
def google_login():

    if not GOOGLE_CLIENT_ID:
        return RedirectResponse(
            url=frontend_url(
                "/?auth_error=google_credentials_missing"
            )
        )

    if not GOOGLE_CLIENT_SECRET:
        return RedirectResponse(
            url=frontend_url(
                "/?auth_error=google_secret_missing"
            )
        )

    params = {
        "client_id": GOOGLE_CLIENT_ID,

        # IMPORTANT:
        # This MUST exactly match Google Cloud Console
        "redirect_uri": GOOGLE_REDIRECT_URI,

        "response_type": "code",

        "scope": "openid email profile",

        "prompt": "select_account",

        "access_type": "online"
    }

    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode(params)
    )

    return RedirectResponse(
        url=google_url
    )


# ============================================================
# GOOGLE CALLBACK
# ============================================================

@router.get("/google/callback")
def google_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None)
):

    # User cancelled Google login
    if error:

        return RedirectResponse(
            url=frontend_url(
                "/?auth_error=google_cancelled"
            )
        )

    if not code:

        return RedirectResponse(
            url=frontend_url(
                "/?auth_error=missing_code"
            )
        )

    # --------------------------------------------------------
    # Exchange authorization code for Google tokens
    # --------------------------------------------------------

    token_url = (
        "https://oauth2.googleapis.com/token"
    )

    token_payload = {

        "code": code,

        "client_id": GOOGLE_CLIENT_ID,

        "client_secret": GOOGLE_CLIENT_SECRET,

        # MUST be identical to login request
        "redirect_uri": GOOGLE_REDIRECT_URI,

        "grant_type": "authorization_code"
    }

    try:

        token_response = requests.post(
            token_url,
            data=token_payload,
            timeout=15
        )

        if token_response.status_code != 200:

            print(
                "[NEXORA] Google token exchange failed:",
                token_response.text
            )

            return RedirectResponse(
                url=frontend_url(
                    "/?auth_error=token_exchange_failed"
                )
            )

        token_data = token_response.json()

        access_token = token_data.get(
            "access_token"
        )

        if not access_token:

            return RedirectResponse(
                url=frontend_url(
                    "/?auth_error=no_access_token"
                )
            )

        # ----------------------------------------------------
        # Get Google user information
        # ----------------------------------------------------

        userinfo_response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={
                "Authorization":
                f"Bearer {access_token}"
            },
            timeout=15
        )

        if userinfo_response.status_code != 200:

            print(
                "[NEXORA] Google userinfo failed:",
                userinfo_response.text
            )

            return RedirectResponse(
                url=frontend_url(
                    "/?auth_error=userinfo_failed"
                )
            )

        user_info = userinfo_response.json()

        # ----------------------------------------------------
        # Extract user
        # ----------------------------------------------------

        google_id = user_info.get(
            "id",
            ""
        )

        email = user_info.get(
            "email",
            ""
        )

        name = user_info.get(
            "name"
        ) or email.split("@")[0]

        picture = user_info.get(
            "picture",
            ""
        )

        if not email:

            return RedirectResponse(
                url=frontend_url(
                    "/?auth_error=email_missing"
                )
            )

        # ----------------------------------------------------
        # Save / load user
        # ----------------------------------------------------

        user_record = get_or_create_user(

            email=email,

            name=name,

            picture=picture,

            provider="google",

            user_id_override=(
                f"google_{google_id}"
                if google_id
                else None
            )
        )

        # ----------------------------------------------------
        # CREATE SESSION
        # ----------------------------------------------------

        request.session["user"] = user_record

        print(
            "[NEXORA] Google login successful:",
            email
        )

        # ----------------------------------------------------
        # Return to Vercel frontend
        # ----------------------------------------------------

        return RedirectResponse(

            url=frontend_url(
                "/?auth=success"
            )
        )

    except requests.exceptions.RequestException as e:

        print(
            "[NEXORA] Google request error:",
            str(e)
        )

        return RedirectResponse(
            url=frontend_url(
                "/?auth_error=network_error"
            )
        )

    except Exception as e:

        print(
            "[NEXORA] Google callback error:",
            str(e)
        )

        return RedirectResponse(
            url=frontend_url(
                "/?auth_error=server_error"
            )
        )


# ============================================================
# GOOGLE GIS TOKEN LOGIN
# ============================================================

@router.post("/google/token")
def verify_google_id_token(
    request: Request,
    payload: TokenVerificationRequest
):

    id_token = payload.credential

    if not id_token:

        raise HTTPException(
            status_code=400,
            detail="Missing Google ID token"
        )

    try:

        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={
                "id_token": id_token
            },
            timeout=15
        )

        if response.status_code != 200:

            raise HTTPException(
                status_code=401,
                detail="Invalid Google ID token"
            )

        token_data = response.json()

        # ----------------------------------------------------
        # Verify token belongs to OUR Google client
        # ----------------------------------------------------

        token_audience = token_data.get(
            "aud"
        )

        if (
            GOOGLE_CLIENT_ID
            and token_audience != GOOGLE_CLIENT_ID
        ):

            raise HTTPException(
                status_code=401,
                detail="Google token audience mismatch"
            )

        email = token_data.get(
            "email",
            ""
        )

        name = token_data.get(
            "name"
        ) or email.split("@")[0]

        picture = token_data.get(
            "picture",
            ""
        )

        google_id = token_data.get(
            "sub",
            ""
        )

        if not email:

            raise HTTPException(
                status_code=400,
                detail="Google account email not available"
            )

        user_record = get_or_create_user(

            email=email,

            name=name,

            picture=picture,

            provider="google",

            user_id_override=(
                f"google_{google_id}"
                if google_id
                else None
            )
        )

        request.session["user"] = user_record

        return {
            "status": "authenticated",
            "user": user_record
        }

    except requests.exceptions.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=f"Google verification error: {str(e)}"
        )


# ============================================================
# EMAIL LOGIN
# ============================================================

@router.post("/email/login")
def email_login(
    request: Request,
    payload: EmailLoginRequest
):

    email = payload.email.strip()

    if (
        not email
        or "@"
        not in email
    ):

        raise HTTPException(
            status_code=400,
            detail="Please provide a valid email address."
        )

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


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def get_current_user(
    request: Request
):

    session_user = request.session.get(
        "user"
    )

    if (
        session_user
        and isinstance(session_user, dict)
        and "email" in session_user
    ):

        db_user = get_user(
            session_user.get("id")
            or session_user.get("email")
        )

        user_data = (
            db_user
            or session_user
        )

        return {
            "authenticated": True,
            "user": user_data
        }

    return {
        "authenticated": False,
        "user": None
    }


# ============================================================
# UPDATE PROFILE
# ============================================================

@router.post("/profile/update")
def update_profile(
    request: Request,
    payload: ProfileUpdateRequest
):

    session_user = request.session.get(
        "user"
    )

    if (
        not session_user
        or not isinstance(session_user, dict)
        or "id" not in session_user
    ):

        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    updated = update_user_profile(

        session_user["id"],

        {
            "name": payload.name,
            "picture": payload.picture
        }
    )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="User profile not found"
        )

    request.session["user"] = updated

    return {
        "status": "success",
        "user": updated
    }


# ============================================================
# LOGOUT
# ============================================================

@router.post("/logout")
@router.get("/logout")
def logout(
    request: Request
):

    request.session.clear()

    return {
        "status": "logged_out",
        "message": "Successfully logged out"
    }