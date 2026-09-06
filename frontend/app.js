/**
 * NEXORA - AI Optimization Engine
 *
 * Production configuration:
 * Frontend: Vercel
 * Backend: Render
 *
 * Backend URL:
 * https://nexora-backend-gcjd.onrender.com
 */

// ============================================================
// BACKEND CONFIGURATION
// ============================================================

const API_BASE = 'https://nexora-backend-gcjd.onrender.com';

console.log('[NEXORA] API_BASE:', API_BASE);


// ============================================================
// APPLICATION GLOBAL STATE
// ============================================================

const state = {
  authenticated: false,

  user: {
    id: 'default_user',
    name: 'User',
    first_name: 'User',
    email: '',
    picture: '',
    plan: 'Free Plan',
    provider: 'email'
  },

  activeWorkspace: 'Personal',
  currentTab: 'home',
  activeConversationId: null,
  activeConversationTitle: null,

  // auto / fast / pro
  activeMode: 'auto',

  useContext: true,
  searchActive: false,
  attachedFile: null,

  workspaces: [
    {
      name: 'Personal',
      description: 'Personal research and daily queries'
    },
    {
      name: 'College',
      description: 'Academic coursework and assignments'
    },
    {
      name: 'Research',
      description: 'Deep technical synthesis'
    },
    {
      name: 'Hackathons',
      description: 'Rapid MVP roadmaps and competitive coding'
    }
  ],

  conversations: [],
  prompts: [],
  activePromptCategory: 'All',

  telemetry: {
    totalRequests: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,

    totalCost: 0.0,
    baselineCost: 0.0,
    totalSavings: 0.0,
    savingsPercentage: 0.0,

    averageLatency: 0,

    cacheHits: 0,
    cacheMisses: 0,

    cheapCount: 0,
    normalCount: 0,
    powerfulCount: 0,

    historyLogs: []
  }
};


// ============================================================
// 3D VISUALIZER OBJECTS
// ============================================================

let auth3D = {
  scene: null,
  camera: null,
  renderer: null,
  sphere: null,
  rings: [],
  particles: null,
  animId: null
};

let hero3D = {
  scene: null,
  camera: null,
  renderer: null,
  sphere: null,
  rings: [],
  particles: null,
  animId: null
};

let routing3D = {
  scene: null,
  camera: null,
  renderer: null,
  coreMesh: null,
  outerRing: null,
  satelliteNodes: [],
  animId: null,
  isRouting: false
};


// ============================================================
// DOM ELEMENTS
// ============================================================

const authScreen =
  document.getElementById('authScreen');

const authLoadingScreen =
  document.getElementById('authLoadingScreen');

const dashboardScreen =
  document.getElementById('dashboardScreen');


// ============================================================
// AUTH ELEMENTS
// ============================================================

const btnGoogleSignIn =
  document.getElementById('btnGoogleSignIn');

const btnEmailSignInToggle =
  document.getElementById('btnEmailSignInToggle');

const emailLoginForm =
  document.getElementById('emailLoginForm');

const emailAuthInput =
  document.getElementById('emailAuthInput');

const nameAuthInput =
  document.getElementById('nameAuthInput');


// ============================================================
// IMPORTANT GOOGLE LOGIN
// ============================================================

if (btnGoogleSignIn) {
  btnGoogleSignIn.href =
    `${API_BASE}/auth/google/login`;
}


// ============================================================
// GOOGLE AUTH
// ============================================================

async function initGoogleGsiConfig() {
  try {
    const res =
      await fetch(`${API_BASE}/auth/config`);

    if (!res.ok) return;

    const cfg = await res.json();

    if (
      cfg.google_client_id &&
      !cfg.google_client_id.startsWith('YOUR_GOOGLE')
    ) {
      const gsiSlot =
        document.getElementById('g_id_onload');

      if (gsiSlot) {
        gsiSlot.setAttribute(
          'data-client_id',
          cfg.google_client_id
        );
      }
    }
  } catch (error) {
    console.warn(
      '[NEXORA] Google configuration check failed:',
      error
    );
  }
}


// ============================================================
// SESSION AUTHENTICATION
// ============================================================

async function checkSessionAuth() {
  try {
    const res = await fetch(
      `${API_BASE}/auth/me`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!res.ok) {
      return false;
    }

    const data = await res.json();

    if (
      data &&
      data.authenticated &&
      data.user
    ) {
      setAuthenticatedUser(data.user);
      return true;
    }

  } catch (error) {
    console.warn(
      '[NEXORA] Session verification failed:',
      error
    );
  }

  return false;
}


// ============================================================
// SET USER
// ============================================================

function setAuthenticatedUser(userData) {
  state.authenticated = true;

  state.user = {
    id:
      userData.id ||
      userData.email ||
      'user',

    name:
      userData.name ||
      'User',

    first_name:
      userData.first_name ||
      (
        userData.name
          ? userData.name.split(' ')[0]
          : 'User'
      ),

    email:
      userData.email || '',

    picture:
      userData.picture || '',

    plan:
      userData.plan || 'Free Plan',

    provider:
      userData.provider || 'email'
  };

  if (
    userData.preferences &&
    userData.preferences.default_workspace
  ) {
    state.activeWorkspace =
      userData.preferences.default_workspace;
  }

  if (
    userData.preferences &&
    userData.preferences.default_mode
  ) {
    state.activeMode =
      userData.preferences.default_mode;
  }
}


// ============================================================
// GOOGLE CREDENTIAL RESPONSE
// ============================================================

window.handleGoogleCredentialResponse =
  async function (response) {

    if (
      !response ||
      !response.credential
    ) {
      return;
    }

    try {

      showLoadingScreen();

      const res = await fetch(
        `${API_BASE}/auth/google/token`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          credentials: 'include',

          body: JSON.stringify({
            credential:
              response.credential
          })
        }
      );

      if (res.ok) {

        const data =
          await res.json();

        if (data && data.user) {

          setAuthenticatedUser(
            data.user
          );

          await runAuthLoadingSequence();

          return;
        }
      }

      alert(
        'Google authentication could not be completed. Please try again.'
      );

      showAuthScreen();

    } catch (error) {

      console.error(
        '[NEXORA] Google authentication error:',
        error
      );

      alert(
        'Google authentication error. Please try again.'
      );

      showAuthScreen();
    }
  };


// ============================================================
// EMAIL LOGIN
// ============================================================

async function handleEmailLogin(e) {

  e.preventDefault();

  const email =
    emailAuthInput.value.trim();

  const name =
    nameAuthInput
      ? nameAuthInput.value.trim()
      : '';

  if (
    !email ||
    !email.includes('@')
  ) {
    alert(
      'Please enter a valid email address.'
    );

    return;
  }

  showLoadingScreen();

  try {

    const res = await fetch(
      `${API_BASE}/auth/email/login`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        credentials: 'include',

        body: JSON.stringify({
          email,
          name:
            name || undefined
        })
      }
    );

    if (res.ok) {

      const data =
        await res.json();

      if (data && data.user) {

        setAuthenticatedUser(
          data.user
        );

        await runAuthLoadingSequence();

        return;
      }
    }

    const errorData =
      await res.json()
        .catch(() => ({}));

    alert(
      errorData.detail ||
      'Email sign-in failed. Please try again.'
    );

    showAuthScreen();

  } catch (error) {

    console.error(
      '[NEXORA] Email login error:',
      error
    );

    alert(
      'Network error connecting to Nexora backend.'
    );

    showAuthScreen();
  }
}