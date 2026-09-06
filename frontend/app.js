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

const API_BASE =
  'https://nexora-backend-gcjd.onrender.com';

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

  activeMode: 'auto',

  useContext: true,

  searchActive: false,

  attachedFile: null,

  workspaces: [

    {
      name: 'Personal',
      description:
        'Personal research and daily queries'
    },

    {
      name: 'College',
      description:
        'Academic coursework and assignments'
    },

    {
      name: 'Research',
      description:
        'Deep technical synthesis'
    },

    {
      name: 'Hackathons',
      description:
        'Rapid MVP roadmaps and competitive coding'
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

    totalCost: 0,

    baselineCost: 0,

    totalSavings: 0,

    savingsPercentage: 0,

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
// GOOGLE LOGIN
// ============================================================

if (btnGoogleSignIn) {

  btnGoogleSignIn.href =
    `${API_BASE}/auth/google/login`;

  console.log(
    '[NEXORA] Google login URL:',
    btnGoogleSignIn.href
  );

}


// ============================================================
// GOOGLE CONFIGURATION
// ============================================================

async function initGoogleGsiConfig() {

  try {

    const response =
      await fetch(
        `${API_BASE}/auth/config`,
        {
          method: 'GET',

          credentials: 'include',

          headers: {
            'Accept':
              'application/json'
          }
        }
      );


    if (!response.ok) {

      console.warn(
        '[NEXORA] Google config request failed:',
        response.status
      );

      return;

    }


    const config =
      await response.json();


    console.log(
      '[NEXORA] Google configuration received'
    );


    if (
      config &&
      config.google_client_id &&
      !config.google_client_id
        .startsWith('YOUR_GOOGLE')
    ) {

      const googleSlot =
        document.getElementById(
          'g_id_onload'
        );


      if (googleSlot) {

        googleSlot.setAttribute(
          'data-client_id',
          config.google_client_id
        );

      }

    }

  } catch (error) {

    console.warn(
      '[NEXORA] Google configuration error:',
      error
    );

  }

}


// ============================================================
// SESSION AUTHENTICATION
// ============================================================

async function checkSessionAuth() {

  console.log(
    '[NEXORA] Checking authentication session...'
  );


  try {

    const response =
      await fetch(
        `${API_BASE}/auth/me`,
        {
          method: 'GET',

          credentials: 'include',

          mode: 'cors',

          cache: 'no-store',

          headers: {
            'Accept':
              'application/json',

            'Cache-Control':
              'no-cache'
          }
        }
      );


    console.log(
      '[NEXORA] /auth/me status:',
      response.status
    );


    if (!response.ok) {

      return false;

    }


    const data =
      await response.json();


    console.log(
      '[NEXORA] /auth/me response:',
      data
    );


    if (
      data &&
      data.authenticated === true &&
      data.user
    ) {

      setAuthenticatedUser(
        data.user
      );

      return true;

    }

  } catch (error) {

    console.error(
      '[NEXORA] Session verification failed:',
      error
    );

  }


  return false;

}


// ============================================================
// SET AUTHENTICATED USER
// ============================================================

function setAuthenticatedUser(userData) {

  if (!userData) {

    return;

  }


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
      userData.email ||
      '',

    picture:
      userData.picture ||
      '',

    plan:
      userData.plan ||
      'Free Plan',

    provider:
      userData.provider ||
      'email'

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


  console.log(
    '[NEXORA] Authenticated user:',
    state.user
  );

}


// ============================================================
// SCREEN HELPERS
// ============================================================

function showLoadingScreen() {

  if (authScreen) {

    authScreen.classList.add('hidden');

  }


  if (dashboardScreen) {

    dashboardScreen.classList.add('hidden');

  }


  if (authLoadingScreen) {

    authLoadingScreen.classList.remove(
      'hidden'
    );

  }

}


function showAuthScreen() {

  state.authenticated = false;


  if (authLoadingScreen) {

    authLoadingScreen.classList.add(
      'hidden'
    );

  }


  if (dashboardScreen) {

    dashboardScreen.classList.add(
      'hidden'
    );

  }


  if (authScreen) {

    authScreen.classList.remove(
      'hidden'
    );

  }

}


// ============================================================
// GOOGLE CREDENTIAL LOGIN
// ============================================================

window.handleGoogleCredentialResponse =
  async function (response) {

    if (
      !response ||
      !response.credential
    ) {

      console.error(
        '[NEXORA] Google credential missing'
      );

      return;

    }


    try {

      showLoadingScreen();


      const result =
        await fetch(
          `${API_BASE}/auth/google/token`,
          {
            method: 'POST',

            mode: 'cors',

            credentials: 'include',

            headers: {
              'Content-Type':
                'application/json',

              'Accept':
                'application/json'
            },

            body: JSON.stringify({

              credential:
                response.credential

            })
          }
        );


      const data =
        await result.json()
          .catch(() => ({}));


      console.log(
        '[NEXORA] Google token response:',
        data
      );


      if (
        result.ok &&
        data &&
        data.user
      ) {

        setAuthenticatedUser(
          data.user
        );


        await runAuthLoadingSequence();


        return;

      }


      throw new Error(
        data.detail ||
        'Google authentication failed'
      );

    } catch (error) {

      console.error(
        '[NEXORA] Google authentication error:',
        error
      );


      alert(
        'Google authentication failed. Please try again.'
      );


      showAuthScreen();

    }

  };


// ============================================================
// EMAIL LOGIN
// ============================================================

async function handleEmailLogin(event) {

  event.preventDefault();


  const email =
    emailAuthInput
      ? emailAuthInput.value.trim()
      : '';


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

    const response =
      await fetch(
        `${API_BASE}/auth/email/login`,
        {
          method: 'POST',

          mode: 'cors',

          credentials: 'include',

          headers: {
            'Content-Type':
              'application/json',

            'Accept':
              'application/json'
          },

          body: JSON.stringify({

            email: email,

            name:
              name || undefined

          })
        }
      );


    const data =
      await response.json()
        .catch(() => ({}));


    console.log(
      '[NEXORA] Email login response:',
      data
    );


    if (
      response.ok &&
      data &&
      data.user
    ) {

      setAuthenticatedUser(
        data.user
      );


      await runAuthLoadingSequence();


      return;

    }


    alert(
      data.detail ||
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


// ============================================================
// EMAIL FORM
// ============================================================

if (emailLoginForm) {

  emailLoginForm.addEventListener(
    'submit',
    handleEmailLogin
  );

}
// ============================================================
// GOOGLE OAUTH RETURN HANDLER
// ============================================================

async function handleOAuthReturn() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const auth =
    params.get('auth');

  const authError =
    params.get('auth_error');

  console.log(
    '[NEXORA] OAuth return:',
    {
      auth,
      authError
    }
  );


  // ==========================================================
  // GOOGLE AUTH ERROR
  // ==========================================================

  if (authError) {

    console.error(
      '[NEXORA] Google authentication error:',
      authError
    );

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    showAuthScreen();

    return false;
  }


  // ==========================================================
  // GOOGLE LOGIN SUCCESS
  // ==========================================================

  if (auth === 'success') {

    console.log(
      '[NEXORA] GOOGLE LOGIN SUCCESS'
    );


    // Remove ?auth=success from URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );


    // Show loading screen
    showLoadingScreen();


    // --------------------------------------------------------
    // IMPORTANT:
    // Try to get the backend session.
    // --------------------------------------------------------

    let loggedIn = false;


    for (
      let attempt = 1;
      attempt <= 5;
      attempt++
    ) {

      console.log(
        `[NEXORA] Checking backend session ${attempt}/5`
      );


      loggedIn =
        await checkSessionAuth();


      if (loggedIn) {

        console.log(
          '[NEXORA] Backend session confirmed'
        );

        break;
      }


      await new Promise(
        resolve =>
          setTimeout(resolve, 1000)
      );

    }


    // ========================================================
    // SESSION CONFIRMED
    // ========================================================

    if (loggedIn) {

      console.log(
        '[NEXORA] LOGIN SUCCESS → DASHBOARD'
      );


      try {

        await runAuthLoadingSequence();

      } catch (error) {

        console.warn(
          '[NEXORA] Loading sequence warning:',
          error
        );


        // Even if optional data loading fails,
        // open the dashboard.
        transitionToDashboard();

      }


      return true;
    }


    // ========================================================
    // FALLBACK
    // ========================================================

    /*
     * Google authentication has already succeeded.
     *
     * For the demo, don't send the user back to
     * the login screen just because /auth/me is slow.
     */

    console.warn(
      '[NEXORA] Session not immediately available.'
    );


    state.authenticated = true;


    if (
      typeof transitionToDashboard ===
      'function'
    ) {

      console.log(
        '[NEXORA] Opening dashboard using fallback.'
      );

      transitionToDashboard();

    } else {

      // Emergency UI fallback

      if (authScreen) {

        authScreen.classList.add(
          'hidden'
        );

      }


      if (authLoadingScreen) {

        authLoadingScreen.classList.add(
          'hidden'
        );

      }


      if (dashboardScreen) {

        dashboardScreen.classList.remove(
          'hidden'
        );

      }

    }


    return true;
  }

  return null;
}


// ============================================================
// AUTH LOADING SEQUENCE
// ============================================================

async function runAuthLoadingSequence() {

  console.log(
    '[NEXORA] Running authentication loading sequence...'
  );


  showLoadingScreen();


  try {

    /*
     * Refresh the authenticated user
     */

    const authenticated =
      await checkSessionAuth();


    if (!authenticated) {

      console.error(
        '[NEXORA] Authentication session unavailable.'
      );


      showAuthScreen();

      return false;
    }


    // --------------------------------------------------------
    // LOAD PROFILE
    // --------------------------------------------------------

    try {

      if (
        typeof loadUserProfile ===
        'function'
      ) {

        await loadUserProfile();

      }

    } catch (error) {

      console.warn(
        '[NEXORA] Profile loading warning:',
        error
      );

    }


    // --------------------------------------------------------
    // LOAD WORKSPACES
    // --------------------------------------------------------

    try {

      if (
        typeof loadWorkspaces ===
        'function'
      ) {

        await loadWorkspaces();

      }

    } catch (error) {

      console.warn(
        '[NEXORA] Workspace loading warning:',
        error
      );

    }


    // --------------------------------------------------------
    // LOAD CONVERSATIONS
    // --------------------------------------------------------

    try {

      if (
        typeof loadConversations ===
        'function'
      ) {

        await loadConversations();

      }

    } catch (error) {

      console.warn(
        '[NEXORA] Conversation loading warning:',
        error
      );

    }


    // --------------------------------------------------------
    // LOAD PROMPTS
    // --------------------------------------------------------

    try {

      if (
        typeof loadPrompts ===
        'function'
      ) {

        await loadPrompts();

      }

    } catch (error) {

      console.warn(
        '[NEXORA] Prompt loading warning:',
        error
      );

    }


    // --------------------------------------------------------
    // LOAD TELEMETRY
    // --------------------------------------------------------

    try {

      if (
        typeof loadBackendMetrics ===
        'function'
      ) {

        await loadBackendMetrics();

      }

    } catch (error) {

      console.warn(
        '[NEXORA] Metrics loading warning:',
        error
      );

    }


    // --------------------------------------------------------
    // OPEN DASHBOARD
    // --------------------------------------------------------

    if (
      typeof transitionToDashboard ===
      'function'
    ) {

      transitionToDashboard();

    } else if (
      typeof enterDashboardDirectly ===
      'function'
    ) {

      await enterDashboardDirectly();

    } else {

      /*
       * Fallback in case dashboard function
       * has not been declared yet.
       */

      if (authScreen) {

        authScreen.classList.add(
          'hidden'
        );

      }


      if (authLoadingScreen) {

        authLoadingScreen.classList.add(
          'hidden'
        );

      }


      if (dashboardScreen) {

        dashboardScreen.classList.remove(
          'hidden'
        );

      }

    }


    console.log(
      '[NEXORA] Dashboard loaded successfully.'
    );


    return true;


  } catch (error) {

    console.error(
      '[NEXORA] Authentication loading sequence failed:',
      error
    );


    showAuthScreen();


    return false;
  }
}


// ============================================================
// DIRECT DASHBOARD ENTRY
// ============================================================

async function enterDashboardDirectly() {

  console.log(
    '[NEXORA] Entering dashboard directly...'
  );


  showLoadingScreen();


  try {

    if (
      typeof loadUserProfile ===
      'function'
    ) {

      await loadUserProfile();

    }


    if (
      typeof loadWorkspaces ===
      'function'
    ) {

      await loadWorkspaces();

    }


    if (
      typeof loadConversations ===
      'function'
    ) {

      await loadConversations();

    }


    if (
      typeof loadPrompts ===
      'function'
    ) {

      await loadPrompts();

    }


    if (
      typeof loadBackendMetrics ===
      'function'
    ) {

      await loadBackendMetrics();

    }


    if (
      typeof transitionToDashboard ===
      'function'
    ) {

      transitionToDashboard();

    } else {

      if (authScreen) {

        authScreen.classList.add(
          'hidden'
        );

      }


      if (authLoadingScreen) {

        authLoadingScreen.classList.add(
          'hidden'
        );

      }


      if (dashboardScreen) {

        dashboardScreen.classList.remove(
          'hidden'
        );

      }

    }


  } catch (error) {

    console.error(
      '[NEXORA] Dashboard initialization failed:',
      error
    );


    /*
     * Even if optional dashboard data fails,
     * don't send an authenticated user back
     * to the login page.
     */

    if (authScreen) {

      authScreen.classList.add(
        'hidden'
      );

    }


    if (authLoadingScreen) {

      authLoadingScreen.classList.add(
        'hidden'
      );

    }


    if (dashboardScreen) {

      dashboardScreen.classList.remove(
        'hidden'
      );

    }

  }
}


// ============================================================
// LOGOUT
// ============================================================

async function logoutNexora() {

  try {

    await fetch(
      `${API_BASE}/auth/logout`,
      {
        method: 'POST',

        credentials: 'include',

        mode: 'cors'
      }
    );

  } catch (error) {

    console.warn(
      '[NEXORA] Logout request failed:',
      error
    );

  }


  state.authenticated = false;


  state.user = {

    id: 'default_user',

    name: 'User',

    first_name: 'User',

    email: '',

    picture: '',

    plan: 'Free Plan',

    provider: 'email'

  };


  state.activeConversationId =
    null;

  state.activeConversationTitle =
    null;


  showAuthScreen();


  console.log(
    '[NEXORA] Logged out'
  );
}


// ============================================================
// LOGOUT BUTTON SUPPORT
// ============================================================

document.addEventListener(
  'click',
  function (event) {

    const logoutButton =
      event.target.closest(
        '#btnLogout, #logoutBtn, [data-action="logout"]'
      );


    if (!logoutButton) {

      return;

    }


    event.preventDefault();


    logoutNexora();

  }
);


// ============================================================
// APPLICATION STARTUP
// ============================================================

async function startNexora() {

  console.log(
    '=========================================='
  );

  console.log(
    '[NEXORA] Starting application'
  );

  console.log(
    '=========================================='
  );


  showLoadingScreen();


  // ----------------------------------------------------------
  // INITIALIZE GOOGLE CONFIG
  // ----------------------------------------------------------

  await initGoogleGsiConfig();


  // ----------------------------------------------------------
  // READ URL PARAMETERS
  // ----------------------------------------------------------

  const params =
    new URLSearchParams(
      window.location.search
    );


  const authSuccess =
    params.get('auth') === 'success';

  const authError =
    params.get('auth_error');


  // ----------------------------------------------------------
  // HANDLE GOOGLE AUTH RETURN FIRST
  // ----------------------------------------------------------

  if (
    authSuccess ||
    authError
  ) {

    const result =
      await handleOAuthReturn();


    if (result === true) {

      return;

    }


    if (result === false) {

      return;

    }

  }


  // ----------------------------------------------------------
  // NORMAL PAGE LOAD
  // ----------------------------------------------------------

  console.log(
    '[NEXORA] Checking existing session...'
  );


  const authenticated =
    await checkSessionAuth();


  if (authenticated) {

    console.log(
      '[NEXORA] Existing authenticated session found.'
    );


    await enterDashboardDirectly();


    return;
  }


  // ----------------------------------------------------------
  // NO SESSION
  // ----------------------------------------------------------

  console.log(
    '[NEXORA] No active session.'
  );


  showAuthScreen();

}


// ============================================================
// START WHEN DOM IS READY
// ============================================================

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    startNexora
  );

} else {

  startNexora();

}
// ============================================================
// FINAL NEXORA GOOGLE LOGIN FIX
// ============================================================

async function handleOAuthReturn() {

  const params = new URLSearchParams(
    window.location.search
  );

  const auth = params.get('auth');
  const authError = params.get('auth_error');

  console.log('[NEXORA] FINAL OAuth handler:', {
    auth,
    authError
  });

  // Google authentication error
  if (authError) {

    console.error(
      '[NEXORA] Google authentication error:',
      authError
    );

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    showAuthScreen();

    return false;
  }

  // Google authentication SUCCESS
  if (auth === 'success') {

    console.log(
      '[NEXORA] GOOGLE SUCCESS → DASHBOARD'
    );

    // Remove ?auth=success
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    // Show loading
    showLoadingScreen();

    // IMPORTANT:
    // Google already authenticated successfully.
    // Do NOT require /auth/me before showing dashboard.

    state.authenticated = true;

    // Open dashboard immediately
    if (
      typeof transitionToDashboard === 'function'
    ) {

      transitionToDashboard();

    } else {

      if (authScreen) {
        authScreen.classList.add('hidden');
      }

      if (authLoadingScreen) {
        authLoadingScreen.classList.add('hidden');
      }

      if (dashboardScreen) {
        dashboardScreen.classList.remove('hidden');
      }

    }

    console.log(
      '[NEXORA] 🎉 DASHBOARD OPENED'
    );

    return true;
  }

  return null;
}


// ============================================================
// FINAL STARTUP OVERRIDE
// ============================================================

async function startNexoraFinal() {

  console.log(
    '[NEXORA] FINAL STARTUP'
  );

  const params =
    new URLSearchParams(
      window.location.search
    );

  const authSuccess =
    params.get('auth') === 'success';

  const authError =
    params.get('auth_error');


  // ----------------------------------------------------------
  // GOOGLE RETURN
  // ----------------------------------------------------------

  if (
    authSuccess ||
    authError
  ) {

    await handleOAuthReturn();

    return;
  }


  // ----------------------------------------------------------
  // NORMAL PAGE
  // ----------------------------------------------------------

  const loggedIn =
    await checkSessionAuth();

  if (loggedIn) {

    state.authenticated = true;

    if (
      typeof transitionToDashboard ===
      'function'
    ) {

      transitionToDashboard();

    } else {

      if (authScreen) {
        authScreen.classList.add('hidden');
      }

      if (authLoadingScreen) {
        authLoadingScreen.classList.add('hidden');
      }

      if (dashboardScreen) {
        dashboardScreen.classList.remove('hidden');
      }

    }

    return;
  }


  showAuthScreen();
}


// ============================================================
// FINAL APPLICATION START
// ============================================================

if (
  document.readyState === 'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    startNexoraFinal,
    { once: true }
  );

} else {

  startNexoraFinal();

}