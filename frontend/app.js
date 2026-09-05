/**
 * NEXORA - AI Optimization Engine
 * Exact Light Theme Implementation matching 3-Screen Reference UI:
 * 1. Screen 1: Google / Email Sign In (Auth First)
 * 2. Screen 2: Authenticating / Loading Screen with Live Progress Checklist
 * 3. Screen 3: Nexora Dashboard (Light Theme, In-Composer Routing, Workspaces, 3D Core)
 */

// Backend Base URL: Checks for injected runtime config (e.g. for Vercel -> Render cross-domain deployment), then window.location.origin
const API_BASE = (typeof window !== 'undefined' && window.NEXORA_API_URL && window.NEXORA_API_URL.trim() !== '')
  ? window.NEXORA_API_URL.trim().replace(/\/+$/, '')
  : window.location.origin;

// Application Global State
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
  activeMode: 'auto', // 'auto', 'fast', 'pro'
  useContext: true,
  searchActive: false,
  attachedFile: null,

  workspaces: [
    { name: 'Personal', description: 'Personal research and daily queries' },
    { name: 'College', description: 'Academic coursework and assignments' },
    { name: 'Research', description: 'Deep technical synthesis' },
    { name: 'Hackathons', description: 'Rapid MVP roadmaps and competitive coding' }
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

// 3D Visualizer Objects
let auth3D = { scene: null, camera: null, renderer: null, sphere: null, rings: [], particles: null, animId: null };
let hero3D = { scene: null, camera: null, renderer: null, sphere: null, rings: [], particles: null, animId: null };
let routing3D = { scene: null, camera: null, renderer: null, coreMesh: null, outerRing: null, satelliteNodes: [], animId: null, isRouting: false };


// ============================================================
// DOM ELEMENTS
// ============================================================
const authScreen = document.getElementById('authScreen');
const authLoadingScreen = document.getElementById('authLoadingScreen');
const dashboardScreen = document.getElementById('dashboardScreen');

// Auth Form Elements
const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
const btnEmailSignInToggle = document.getElementById('btnEmailSignInToggle');
const emailLoginForm = document.getElementById('emailLoginForm');
const emailAuthInput = document.getElementById('emailAuthInput');
const nameAuthInput = document.getElementById('nameAuthInput');

// Sidebar Elements
const sidebarLeft = document.getElementById('sidebarLeft');
const btnCollapseSidebar = document.getElementById('btnCollapseSidebar');
const navHome = document.getElementById('navHome');
const navExplore = document.getElementById('navExplore');
const navImpact = document.getElementById('navImpact');
const navPromptLib = document.getElementById('navPromptLib');
const navRoutingCore = document.getElementById('navRoutingCore');
const navAnalyticsSidebar = document.getElementById('navAnalyticsSidebar');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnOpenHelp = document.getElementById('btnOpenHelp');
const btnOpenHistory = document.getElementById('btnOpenHistory');
const btnUpgradePro = document.getElementById('btnUpgradePro');

// User Profile Displays
const userNameDisplay = document.getElementById('userNameDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userAvatarInitial = document.getElementById('userAvatarInitial');
const userAvatarImg = document.getElementById('userAvatarImg');
const topProfileBtn = document.getElementById('topProfileBtn');
const topAvatarLetter = document.getElementById('topAvatarLetter');
const heroUserName = document.getElementById('heroUserName');
const workspaceHeaderTitle = document.getElementById('workspaceHeaderTitle');

// Top Search & Controls
const globalSearchInput = document.getElementById('globalSearchInput');
const btnToggleTheme = document.getElementById('btnToggleTheme');
const btnNotifications = document.getElementById('btnNotifications');
const topRoutingStatusPill = document.getElementById('topRoutingStatusPill');
const topRoutingStatusText = document.getElementById('topRoutingStatusText');

// Home Dashboard & Chat Composer
const activeConvHeaderPill = document.getElementById('activeConvHeaderPill');
const activeConvTitleDisplay = document.getElementById('activeConvTitleDisplay');
const btnNewChatInline = document.getElementById('btnNewChatInline');
const mainChatForm = document.getElementById('mainChatForm');
const mainChatInput = document.getElementById('mainChatInput');
const sendBtn = document.getElementById('sendBtn');
const btnAttach = document.getElementById('btnAttach');
const fileAttachmentInput = document.getElementById('fileAttachmentInput');
const attachmentChipContainer = document.getElementById('attachmentChipContainer');
const btnSearch = document.getElementById('btnSearch');
const btnSearchLabel = document.getElementById('btnSearchLabel');
const useContextToggle = document.getElementById('useContextToggle');
const tierBtnFast = document.getElementById('tierBtnFast');
const tierBtnPro = document.getElementById('tierBtnPro');
const tierBtnAuto = document.getElementById('tierBtnAuto');
const chatStream = document.getElementById('chatStream');
const chatLoadingState = document.getElementById('chatLoadingState');
const loadingStepText = document.getElementById('loadingStepText');

// Views
const views = {
  home: document.getElementById('viewHome'),
  explore: document.getElementById('viewExplore'),
  impact: document.getElementById('viewImpact'),
  prompts: document.getElementById('viewPrompts'),
  'routing-core': document.getElementById('viewRoutingCore'),
  analytics: document.getElementById('viewAnalytics')
};

// Workspaces
const workspaceList = document.getElementById('workspaceList');
const createWorkspaceBtn = document.getElementById('createWorkspaceBtn');
const createWorkspaceModal = document.getElementById('createWorkspaceModal');
const closeWsModalBtn = document.getElementById('closeWsModalBtn');
const createWorkspaceForm = document.getElementById('createWorkspaceForm');
const wsNameInput = document.getElementById('wsNameInput');
const wsDescInput = document.getElementById('wsDescInput');

// Prompt Library
const promptCategoryFilterStrip = document.getElementById('promptCategoryFilterStrip');
const promptsGridContainer = document.getElementById('promptsGridContainer');
const openAddPromptModalBtn = document.getElementById('openAddPromptModalBtn');
const addPromptModal = document.getElementById('addPromptModal');
const closePromptModalBtn = document.getElementById('closePromptModalBtn');
const addPromptForm = document.getElementById('addPromptForm');
const promptTitleInput = document.getElementById('promptTitleInput');
const promptCategorySelect = document.getElementById('promptCategorySelect');
const promptTextInput = document.getElementById('promptTextInput');

// Modals
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const tabBtnAiProviders = document.getElementById('tabBtnAiProviders');
const tabBtnAccount = document.getElementById('tabBtnAccount');
const tabBtnPreferences = document.getElementById('tabBtnPreferences');
const settingsTabProviders = document.getElementById('settingsTabProviders');
const settingsTabAccount = document.getElementById('settingsTabAccount');
const settingsTabPreferences = document.getElementById('settingsTabPreferences');
const providerSettingsForm = document.getElementById('providerSettingsForm');
const btnRefreshProviderStatus = document.getElementById('btnRefreshProviderStatus');
const profileEditForm = document.getElementById('profileEditForm');
const profileNameInput = document.getElementById('profileNameInput');
const profileEmailDisplay = document.getElementById('profileEmailDisplay');
const modalProfileInitial = document.getElementById('modalProfileInitial');
const logoutBtn = document.getElementById('logoutBtn');

const plansModal = document.getElementById('plansModal');
const closePlansModalBtn = document.getElementById('closePlansModalBtn');
const btnConfirmUpgradePro = document.getElementById('btnConfirmUpgradePro');

const historyModal = document.getElementById('historyModal');
const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
const historyModalListContainer = document.getElementById('historyModalListContainer');
const historyWorkspaceLabel = document.getElementById('historyWorkspaceLabel');

const helpModal = document.getElementById('helpModal');
const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
const refreshImpactBtn = document.getElementById('refreshImpactBtn');
const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');


// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  initGoogleGsiConfig();

  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth') === 'success';
  const authError = urlParams.get('auth_error');

  if (authError) {
    if (authError === 'google_credentials_missing') {
      alert("Google Sign-In isn't configured yet.\nPlease configure Google OAuth credentials in backend/.env.");
    } else if (authError === 'cancelled') {
      console.log('Google login cancelled by user.');
    } else {
      alert("Authentication error. Please try again.");
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Check initial authentication state
  const isAuth = await checkSessionAuth();

  if (!isAuth) {
    showAuthScreen();
  } else if (authSuccess) {
    window.history.replaceState({}, document.title, window.location.pathname);
    showLoadingScreen();
    await runAuthLoadingSequence();
  } else {
    await enterDashboardDirectly();
  }
});


// ============================================================
// 1. AUTHENTICATION & LOGIN FLOW
// ============================================================
async function checkSessionAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.authenticated && data.user) {
        setAuthenticatedUser(data.user);
        return true;
      }
    }
  } catch (e) {
    console.warn('Session verification notice:', e);
  }
  return false;
}

function showAuthScreen() {
  state.authenticated = false;
  authScreen.classList.remove('hidden');
  authLoadingScreen.classList.add('hidden');
  dashboardScreen.classList.add('hidden');
  init3DSphereVisual('auth3dCanvas', auth3D);
}

function setAuthenticatedUser(userData) {
  state.authenticated = true;
  state.user = {
    id: userData.id || userData.email || 'user',
    name: userData.name || 'User',
    first_name: userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'User'),
    email: userData.email || '',
    picture: userData.picture || '',
    plan: userData.plan || 'Free Plan',
    provider: userData.provider || 'email'
  };

  if (userData.preferences && userData.preferences.default_workspace) {
    state.activeWorkspace = userData.preferences.default_workspace;
  }
  if (userData.preferences && userData.preferences.default_mode) {
    state.activeMode = userData.preferences.default_mode;
  }
}

async function initGoogleGsiConfig() {
  try {
    const res = await fetch(`${API_BASE}/auth/config`);
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.google_client_id && !cfg.google_client_id.startsWith('YOUR_GOOGLE')) {
        const gsiSlot = document.getElementById('g_id_onload');
        if (gsiSlot) {
          gsiSlot.setAttribute('data-client_id', cfg.google_client_id);
        }
      }
    }
  } catch (e) {
    console.warn('Google GSI config check:', e);
  }
}

// Google Identity Services One-Tap Callback
window.handleGoogleCredentialResponse = async function(response) {
  if (!response || !response.credential) return;
  try {
    showLoadingScreen();
    await updateLoadingStep(1, true);

    const res = await fetch(`${API_BASE}/auth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential: response.credential })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        setAuthenticatedUser(data.user);
        await runAuthLoadingSequence();
        return;
      }
    }
    alert('Google authentication could not be completed. Please try again.');
    showAuthScreen();
  } catch (e) {
    console.error('Google token error:', e);
    alert('Google authentication error. Please try again.');
    showAuthScreen();
  }
};

// Email Authentication Submission
async function handleEmailLogin(e) {
  e.preventDefault();
  const email = emailAuthInput.value.trim();
  const name = nameAuthInput.value.trim();
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }

  showLoadingScreen();
  await updateLoadingStep(1, true);

  try {
    const res = await fetch(`${API_BASE}/auth/email/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email, name: name || undefined })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        setAuthenticatedUser(data.user);
        await runAuthLoadingSequence();
        return;
      }
    }
    const err = await res.json().catch(() => ({}));
    alert(err.detail || 'Email sign-in failed. Please try again.');
    showAuthScreen();
  } catch (err) {
    console.error('Email sign in error:', err);
    alert('Network error connecting to backend. Please ensure backend is running on http://127.0.0.1:8000.');
    showAuthScreen();
  }
}


// ============================================================
// 2. AUTHENTICATING / LOADING SCREEN PROGRESSION
// ============================================================
function showLoadingScreen() {
  authScreen.classList.add('hidden');
  authLoadingScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');

  // Reset checklist badges
  for (let i = 1; i <= 6; i++) {
    const row = document.getElementById(`checkStep${i}`);
    if (row) {
      row.classList.remove('completed');
      const badge = row.querySelector('.check-badge');
      if (badge) badge.classList.remove('active');
    }
  }
}

async function updateLoadingStep(stepNum, isCompleted = true) {
  const row = document.getElementById(`checkStep${stepNum}`);
  if (row) {
    if (isCompleted) {
      row.classList.add('completed');
      const badge = row.querySelector('.check-badge');
      if (badge) badge.classList.add('active');
    }
  }
  // Smooth human-friendly micro-delay
  await new Promise(r => setTimeout(r, 220));
}

async function runAuthLoadingSequence() {
  // Step 1: Connecting to Google
  await updateLoadingStep(1, true);

  // Step 2: Verifying account
  await checkSessionAuth();
  await updateLoadingStep(2, true);

  // Step 3: Fetching your profile
  updateProfileDisplays();
  await updateLoadingStep(3, true);

  // Step 4: Setting up your workspace
  await fetchWorkspaces();
  await updateLoadingStep(4, true);

  // Step 5: Loading conversations
  await fetchWorkspaceConversations();
  await updateLoadingStep(5, true);

  // Step 6: Almost there...
  await fetchPromptLibrary();
  await fetchBackendMetrics();
  await updateLoadingStep(6, true);

  // Smooth transition to dashboard
  setTimeout(() => {
    transitionToDashboard();
  }, 350);
}

async function enterDashboardDirectly() {
  await fetchWorkspaces();
  await fetchWorkspaceConversations();
  await fetchPromptLibrary();
  await fetchBackendMetrics();
  transitionToDashboard();
}

function transitionToDashboard() {
  authScreen.classList.add('hidden');
  authLoadingScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');

  updateProfileDisplays();
  renderWorkspaceList();
  renderPromptsGrid();
  renderPromptCategoryFilters();
  setMode(state.activeMode || 'auto');

  init3DSphereVisual('hero3dCanvas', hero3D);
  init3DRoutingCoreEngine();
  checkProviderHealthStatus();

  // Check URL query parameters for tab routing
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam && views[tabParam]) {
    switchTab(tabParam);
  } else {
    switchTab('home');
  }
}


// ============================================================
// 3. USER PROFILE & GREETINGS
// ============================================================
function updateProfileDisplays() {
  const u = state.user;
  const fullName = u.name || 'User';
  const firstName = u.first_name || fullName.split(' ')[0] || 'User';
  const email = u.email || 'user@nexora.ai';
  const initial = (firstName.charAt(0) || 'U').toUpperCase();

  // Dynamic Greeting
  if (heroUserName) heroUserName.textContent = `${firstName}!`;
  if (userNameDisplay) userNameDisplay.textContent = fullName;
  if (userEmailDisplay) userEmailDisplay.textContent = email;
  if (userAvatarInitial) userAvatarInitial.textContent = initial;
  if (topAvatarLetter) topAvatarLetter.textContent = initial;

  if (profileNameInput) profileNameInput.value = fullName;
  if (profileEmailDisplay) profileEmailDisplay.value = email;
  if (modalProfileInitial) modalProfileInitial.textContent = initial;

  if (u.picture && userAvatarImg) {
    userAvatarImg.src = u.picture;
    userAvatarImg.classList.remove('hidden');
    if (userAvatarInitial) userAvatarInitial.classList.add('hidden');
  }

  if (workspaceHeaderTitle) {
    workspaceHeaderTitle.textContent = `${state.activeWorkspace} Workspace • One question. Smarter answers. Lower cost.`;
  }
}


// ============================================================
// 4. WORKSPACES MANAGEMENT
// ============================================================
async function fetchWorkspaces() {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.workspaces && data.workspaces.length > 0) {
        state.workspaces = data.workspaces;
      }
    }
  } catch (e) {
    console.warn('Fetch workspaces notice:', e);
  }
}

function renderWorkspaceList() {
  if (!workspaceList) return;
  workspaceList.innerHTML = '';

  state.workspaces.forEach(ws => {
    const wsName = typeof ws === 'string' ? ws : ws.name;
    const isActive = wsName === state.activeWorkspace;

    const item = document.createElement('div');
    item.className = `ws-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>${escapeHtml(wsName)}</span>
    `;

    item.addEventListener('click', () => switchWorkspace(wsName));
    workspaceList.appendChild(item);
  });
}

async function switchWorkspace(wsName) {
  state.activeWorkspace = wsName;
  renderWorkspaceList();
  if (workspaceHeaderTitle) {
    workspaceHeaderTitle.textContent = `${wsName} Workspace • One question. Smarter answers. Lower cost.`;
  }

  startNewChat();
  await fetchWorkspaceConversations();
}

async function handleCreateWorkspace(e) {
  e.preventDefault();
  const name = wsNameInput.value.trim();
  const desc = wsDescInput ? wsDescInput.value.trim() : '';
  if (!name) return;

  try {
    const res = await fetch(`${API_BASE}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: name, description: desc })
    });

    if (res.ok) {
      await fetchWorkspaces();
      createWorkspaceModal.classList.add('hidden');
      await switchWorkspace(name);
    }
  } catch (err) {
    console.error('Create workspace error:', err);
  }
}


// ============================================================
// 5. CONVERSATION PERSISTENCE & CONTEXT RETENTION
// ============================================================
async function fetchWorkspaceConversations() {
  try {
    const res = await fetch(`${API_BASE}/api/conversations?workspace_id=${encodeURIComponent(state.activeWorkspace)}`, {
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      state.conversations = data.conversations || [];
    }
  } catch (e) {
    console.warn('Fetch conversations notice:', e);
  }
}

function startNewChat() {
  state.activeConversationId = null;
  state.activeConversationTitle = null;
  chatStream.innerHTML = '';
  if (activeConvHeaderPill) activeConvHeaderPill.classList.add('hidden');
  if (mainChatInput) {
    mainChatInput.value = '';
    mainChatInput.focus();
  }
  clearAttachment();
  switchTab('home');
}

async function loadConversation(convId) {
  try {
    chatLoadingState.classList.remove('hidden');
    if (loadingStepText) loadingStepText.textContent = "Loading conversation history...";

    const res = await fetch(`${API_BASE}/api/conversations/${convId}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const conv = data.conversation;
      if (conv) {
        state.activeConversationId = conv.id;
        state.activeConversationTitle = conv.title;
        state.activeWorkspace = conv.workspace_id || state.activeWorkspace;
        renderWorkspaceList();

        if (activeConvTitleDisplay) activeConvTitleDisplay.textContent = conv.title || 'Conversation';
        if (activeConvHeaderPill) activeConvHeaderPill.classList.remove('hidden');

        chatStream.innerHTML = '';
        if (conv.messages && conv.messages.length > 0) {
          conv.messages.forEach(m => {
            if (m.role === 'user') {
              appendUserMessageBubble(m.content, false);
            } else if (m.role === 'assistant') {
              appendAssistantCard(m.content, m, false);
            }
          });
        }

        switchTab('home');
        historyModal.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Load conversation error:', err);
  } finally {
    chatLoadingState.classList.add('hidden');
    chatStream.scrollTop = chatStream.scrollHeight;
  }
}


// ============================================================
// 6. CHAT SUBMISSION & ROUTING EXECUTION PIPELINE
// ============================================================
async function handleChatSubmit(e) {
  e.preventDefault();
  const query = mainChatInput.value.trim();
  if (!query) return;

  mainChatInput.value = '';
  const attachedContext = state.attachedFile ? `[Document: ${state.attachedFile.name}]\n${state.attachedFile.content}` : '';
  const searchActive = state.searchActive;
  clearAttachment();

  // 1. Render User Message
  appendUserMessageBubble(query, true);

  // 2. Pulse Loading Animation
  chatLoadingState.classList.remove('hidden');
  sendBtn.disabled = true;

  const steps = [
    "NEXORA is analyzing query complexity...",
    "Evaluating neural candidates and cost...",
    "Routing to optimal model tier...",
    "Generating AI response..."
  ];
  let stepIdx = 0;
  if (loadingStepText) loadingStepText.textContent = steps[0];
  const stepTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    if (loadingStepText) loadingStepText.textContent = steps[stepIdx];
  }, 450);

  const startTime = Date.now();

  try {
    const payload = {
      message: query,
      conversation_id: state.activeConversationId || null,
      workspace_id: state.activeWorkspace,
      mode: state.activeMode,
      use_context: state.useContext,
      context: attachedContext || null,
      use_search: searchActive
    };

    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
    }

    const data = await res.json();

    // 3. Update Conversation ID & Header
    state.activeConversationId = data.conversation_id;
    state.activeConversationTitle = data.conversation_title;
    if (activeConvTitleDisplay) activeConvTitleDisplay.textContent = data.conversation_title || 'Active Conversation';
    if (activeConvHeaderPill) activeConvHeaderPill.classList.remove('hidden');

    // 4. Trigger 3D Visualizer Burst & Telemetry Update
    trigger3DRoutingBurst(data.tier);
    updateRoutingTelemetryHUD(query, data);
    updateLiveMetrics(query, data);

    // 5. Append Assistant Card
    appendAssistantCard(data.answer, data, true, query);

    // 6. Refresh Conversations list
    fetchWorkspaceConversations();

  } catch (err) {
    console.error('Chat routing error:', err);
    appendAssistantCard(
      `AI provider isn't configured yet.\n\nConnect an AI provider in **Settings → AI Providers** to start generating responses.\n\n<details><summary>🔍 Technical details</summary>\n\n\`\`\`\n${err.message}\n\`\`\`\n</details>`,
      {
        model: "NEXORA Router",
        tier: "cheap",
        difficulty: "easy",
        cost: 0.0,
        baseline_cost: 0.0,
        savings: 0.0,
        latency_ms: Math.max(10, Date.now() - startTime),
        is_configuration_error: true
      },
      true,
      query
    );
  } finally {
    clearInterval(stepTimer);
    chatLoadingState.classList.add('hidden');
    sendBtn.disabled = false;
    chatStream.scrollTop = chatStream.scrollHeight;
  }
}

function appendUserMessageBubble(text, shouldScroll = true) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg-user';
  msgDiv.textContent = text;
  chatStream.appendChild(msgDiv);
  if (shouldScroll) chatStream.scrollTop = chatStream.scrollHeight;
}

function appendAssistantCard(answerText, meta = {}, shouldScroll = true, originalQuery = '') {
  const answerDiv = document.createElement('div');
  answerDiv.className = 'chat-msg-answer';

  const modelLabel = meta.model || meta.selected_model || 'NEXORA Neural Engine';
  const tierName = (meta.tier || 'cheap').toUpperCase();

  let settingsActionHtml = '';
  if (meta.is_configuration_error) {
    settingsActionHtml = `
      <div style="margin-top: 0.75rem;">
        <button type="button" class="btn-primary-gradient btn-open-settings-inline" style="padding: 0.45rem 0.9rem; font-size: 0.82rem;">
          ⚙️ Open AI Settings
        </button>
      </div>
    `;
  }

  answerDiv.innerHTML = `
    <div class="answer-header">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
      <span>NEXORA AI • ${escapeHtml(modelLabel)}</span>
      <span class="badge text-purple font-mono" style="margin-left: auto;">${tierName}</span>
    </div>
    <div class="answer-body">${formatMarkdown(answerText)}</div>
    ${settingsActionHtml}
    <div class="answer-meta-row">
      <div class="meta-actions-left">
        <button type="button" class="btn-action-sm btn-copy-ans" title="Copy response">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="copy-lbl">Copy</span>
        </button>
        <button type="button" class="btn-action-sm btn-regen-ans" title="Regenerate">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>Regenerate</span>
        </button>
      </div>
      <button type="button" class="btn-meta-details btn-inspect-route">
        <span>Inspect routing telemetry</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  `;

  // Action listeners
  const btnCopy = answerDiv.querySelector('.btn-copy-ans');
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(answerText);
    const lbl = btnCopy.querySelector('.copy-lbl');
    lbl.textContent = 'Copied!';
    setTimeout(() => { lbl.textContent = 'Copy'; }, 1800);
  });

  const btnRegen = answerDiv.querySelector('.btn-regen-ans');
  btnRegen.addEventListener('click', () => {
    if (originalQuery) {
      mainChatInput.value = originalQuery;
      mainChatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  const btnInspect = answerDiv.querySelector('.btn-inspect-route');
  btnInspect.addEventListener('click', () => switchTab('routing-core'));

  const btnInlineSettings = answerDiv.querySelector('.btn-open-settings-inline');
  if (btnInlineSettings) {
    btnInlineSettings.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
      switchSettingsTab('providers');
    });
  }

  chatStream.appendChild(answerDiv);
  if (shouldScroll) chatStream.scrollTop = chatStream.scrollHeight;
}


// ============================================================
// 7. 3D ROUTING CORE & TELEMETRY HUD
// ============================================================
function updateRoutingTelemetryHUD(query, data) {
  const diff = (data.difficulty || 'easy').toUpperCase();
  const tier = (data.tier || 'cheap').toUpperCase();
  const cost = typeof data.estimated_cost === 'number' ? data.estimated_cost : (typeof data.cost === 'number' ? data.cost : 0.0012);
  const baseline = typeof data.baseline_cost === 'number' ? data.baseline_cost : 0.0240;

  const rcUserQuery = document.getElementById('rcUserQuery');
  const rcDifficulty = document.getElementById('rcDifficulty');
  const rcTier = document.getElementById('rcTier');
  const rcModel = document.getElementById('rcModel');

  if (rcUserQuery) rcUserQuery.textContent = `"${truncate(query, 24)}"`;
  if (rcDifficulty) rcDifficulty.textContent = diff;
  if (rcTier) rcTier.textContent = `${tier} TIER`;
  if (rcModel) rcModel.textContent = data.model || data.selected_model || 'Optimal Model';

  const rcHudComplexity = document.getElementById('rcHudComplexity');
  const rcHudModel = document.getElementById('rcHudModel');
  const rcHudCost = document.getElementById('rcHudCost');
  const rcHudBaseline = document.getElementById('rcHudBaseline');
  const rcHudReason = document.getElementById('rcHudReason');

  if (rcHudComplexity) rcHudComplexity.textContent = diff;
  if (rcHudModel) rcHudModel.textContent = data.model || data.selected_model || 'Optimal Model';
  if (rcHudCost) rcHudCost.textContent = `$${cost.toFixed(4)}`;
  if (rcHudBaseline) rcHudBaseline.textContent = `$${baseline.toFixed(4)}`;
  if (rcHudReason) rcHudReason.textContent = data.reason || 'Optimal routing based on computational depth';
}

function updateLiveMetrics(query, data) {
  const t = state.telemetry;
  t.totalRequests += 1;

  const cost = typeof data.estimated_cost === 'number' ? data.estimated_cost : (typeof data.cost === 'number' ? data.cost : 0.0012);
  const baseline = typeof data.baseline_cost === 'number' ? data.baseline_cost : 0.0240;
  const savings = Math.max(0, baseline - cost);

  t.totalCost += cost;
  t.baselineCost += baseline;
  t.totalSavings += savings;

  const inTok = data.tokens ? data.tokens.input : 25;
  const outTok = data.tokens ? data.tokens.output : 65;
  t.inputTokens += inTok;
  t.outputTokens += outTok;
  t.totalTokens += (inTok + outTok);

  const tier = (data.tier || 'cheap').toLowerCase();
  if (tier === 'cheap') t.cheapCount += 1;
  else if (tier === 'normal') t.normalCount += 1;
  else t.powerfulCount += 1;

  if (data.cache_hit) t.cacheHits += 1;
  else t.cacheMisses += 1;

  t.historyLogs.unshift({
    query: query,
    difficulty: data.difficulty || 'easy',
    tier: data.tier || 'cheap',
    model: data.model || 'Haiku / Small (FAST)',
    tokens: (inTok + outTok),
    cost: cost,
    savings: savings,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  renderImpactPage();
  renderAnalyticsAudit();
}

async function fetchBackendMetrics() {
  try {
    const res = await fetch(`${API_BASE}/metrics`);
    if (res.ok) {
      const m = await res.json();
      const t = state.telemetry;
      t.totalRequests = m.total_requests || t.totalRequests;
      t.totalCost = m.total_cost || t.totalCost;
      t.baselineCost = m.baseline_cost || t.baselineCost;
      t.totalSavings = m.total_savings || t.totalSavings;
      t.savingsPercentage = m.savings_percentage || 69.4;
      t.averageLatency = m.average_latency || 145;
      t.cacheHits = m.cache_hits || 0;
      t.cacheMisses = m.cache_misses || 0;
      t.cheapCount = m.easy_requests || 0;
      t.normalCount = m.medium_requests || 0;
      t.powerfulCount = m.hard_requests || 0;
      renderImpactPage();
    }
  } catch (e) {
    console.warn('Backend metrics fetch notice:', e);
  }
}

function renderImpactPage() {
  const t = state.telemetry;
  const netSavedDollars = Math.max(0, t.baselineCost - t.totalCost);
  const totalCostSavedPct = t.baselineCost > 0 ? ((netSavedDollars / t.baselineCost) * 100).toFixed(1) : '69.4';

  const impSavedHeroPct = document.getElementById('impSavedHeroPct');
  const impHeroSavedAmount = document.getElementById('impHeroSavedAmount');
  const impTotalRequests = document.getElementById('impTotalRequests');
  const impTotalTokens = document.getElementById('impTotalTokens');
  const impTokensDetail = document.getElementById('impTokensDetail');
  const impTotalCost = document.getElementById('impTotalCost');
  const impCostSaved = document.getElementById('impCostSaved');
  const impNetSaved = document.getElementById('impNetSaved');
  const impAvgLatency = document.getElementById('impAvgLatency');
  const impCacheHitRate = document.getElementById('impCacheHitRate');

  if (impSavedHeroPct) impSavedHeroPct.textContent = `${totalCostSavedPct}%`;
  if (impHeroSavedAmount) impHeroSavedAmount.textContent = `$${netSavedDollars.toFixed(4)}`;
  if (impTotalRequests) impTotalRequests.textContent = t.totalRequests;
  if (impTotalTokens) impTotalTokens.textContent = t.totalTokens.toLocaleString();
  if (impTokensDetail) impTokensDetail.textContent = `In: ${t.inputTokens.toLocaleString()} | Out: ${t.outputTokens.toLocaleString()}`;
  if (impTotalCost) impTotalCost.textContent = `$${t.totalCost.toFixed(4)}`;
  if (impCostSaved) impCostSaved.textContent = `${totalCostSavedPct}%`;
  if (impNetSaved) impNetSaved.textContent = `$${netSavedDollars.toFixed(4)} net saved`;
  if (impAvgLatency) impAvgLatency.textContent = `${Math.round(t.averageLatency || 140)} ms`;

  const totalCache = t.cacheHits + t.cacheMisses;
  const hitRate = totalCache > 0 ? ((t.cacheHits / totalCache) * 100).toFixed(1) : '0.0';
  if (impCacheHitRate) impCacheHitRate.textContent = `Cache hit rate: ${hitRate}%`;

  const impTierTotalCount = document.getElementById('impTierTotalCount');
  const impCheapCount = document.getElementById('impCheapCount');
  const impNormalCount = document.getElementById('impNormalCount');
  const impPowerfulCount = document.getElementById('impPowerfulCount');
  const impCheapFill = document.getElementById('impCheapFill');
  const impNormalFill = document.getElementById('impNormalFill');
  const impPowerfulFill = document.getElementById('impPowerfulFill');

  const totalTiers = t.cheapCount + t.normalCount + t.powerfulCount;
  if (impTierTotalCount) impTierTotalCount.textContent = `${totalTiers} Queries`;
  if (impCheapCount) impCheapCount.textContent = `${t.cheapCount} req`;
  if (impNormalCount) impNormalCount.textContent = `${t.normalCount} req`;
  if (impPowerfulCount) impPowerfulCount.textContent = `${t.powerfulCount} req`;

  if (totalTiers > 0) {
    if (impCheapFill) impCheapFill.style.width = `${(t.cheapCount / totalTiers) * 100}%`;
    if (impNormalFill) impNormalFill.style.width = `${(t.normalCount / totalTiers) * 100}%`;
    if (impPowerfulFill) impPowerfulFill.style.width = `${(t.powerfulCount / totalTiers) * 100}%`;
  }

  drawImpactComparisonChart(t.baselineCost, t.totalCost);
}

function drawImpactComparisonChart(baseline, optimized) {
  const canvas = document.getElementById('impactCostCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let y = 30; y < h - 35; y += 40) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(w - 20, y);
    ctx.stroke();
  }

  const maxVal = Math.max(0.024, baseline * 1.25);
  const barWidth = 70;

  // 1. Baseline Bar (GPT-4)
  const baselineHeight = (baseline / maxVal) * (h - 90);
  const bX = w * 0.28;
  const bY = h - 45 - baselineHeight;

  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bX, bY, barWidth, Math.max(10, baselineHeight), [8, 8, 0, 0]);
  else ctx.rect(bX, bY, barWidth, Math.max(10, baselineHeight));
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.fillText('Baseline GPT-4', bX + barWidth / 2, h - 20);
  ctx.fillText(`$${baseline.toFixed(4)}`, bX + barWidth / 2, bY - 8);

  // 2. NEXORA Routed Bar
  const optHeight = (optimized / maxVal) * (h - 90);
  const oX = w * 0.62;
  const oY = h - 45 - optHeight;

  const oGrad = ctx.createLinearGradient(0, oY, 0, h - 45);
  oGrad.addColorStop(0, '#7c3aed');
  oGrad.addColorStop(1, '#ec4899');

  ctx.fillStyle = oGrad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(oX, oY, barWidth, Math.max(10, optHeight), [8, 8, 0, 0]);
  else ctx.rect(oX, oY, barWidth, Math.max(10, optHeight));
  ctx.fill();

  ctx.fillStyle = '#7c3aed';
  ctx.font = 'bold 11px Plus Jakarta Sans';
  ctx.fillText('NEXORA Routed', oX + barWidth / 2, h - 20);
  ctx.fillText(`$${optimized.toFixed(4)}`, oX + barWidth / 2, oY - 8);
}

function renderAnalyticsAudit() {
  const tbody = document.getElementById('analyticsHistoryBody');
  if (!tbody) return;

  const logs = state.telemetry.historyLogs;
  tbody.innerHTML = '';
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No requests recorded yet. Start by asking a question on Home!</td></tr>`;
  } else {
    logs.slice(0, 20).forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td title="${escapeHtml(item.query)}"><strong>${escapeHtml(truncate(item.query, 32))}</strong></td>
        <td><span class="badge font-mono">${item.difficulty.toUpperCase()}</span></td>
        <td>${item.tier.toUpperCase()}</td>
        <td>${escapeHtml(item.model)}</td>
        <td class="font-mono">${item.tokens}</td>
        <td class="font-mono text-purple">$${item.cost.toFixed(4)}</td>
        <td class="font-mono text-green">+$${item.savings.toFixed(4)}</td>
        <td class="text-muted">${item.time}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}


// ============================================================
// 8. PROMPT LIBRARY MANAGEMENT
// ============================================================
async function fetchPromptLibrary(category = null) {
  try {
    const catQuery = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_BASE}/api/prompts${catQuery}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      state.prompts = data.prompts || [];
      renderPromptsGrid();
    }
  } catch (e) {
    console.warn('Fetch prompts notice:', e);
  }
}

function renderPromptCategoryFilters() {
  if (!promptCategoryFilterStrip) return;
  const categories = ['All', 'Coding', 'Research', 'Writing', 'Study', 'Business', 'Data Analysis', 'Custom'];
  promptCategoryFilterStrip.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-chip ${cat === state.activePromptCategory ? 'active' : ''}`;
    btn.textContent = cat === 'All' ? 'All Prompts' : cat;
    btn.addEventListener('click', () => {
      state.activePromptCategory = cat;
      renderPromptCategoryFilters();
      fetchPromptLibrary(cat);
    });
    promptCategoryFilterStrip.appendChild(btn);
  });
}

function renderPromptsGrid() {
  if (!promptsGridContainer) return;
  promptsGridContainer.innerHTML = '';

  if (state.prompts.length === 0) {
    promptsGridContainer.innerHTML = `
      <div class="text-center text-muted" style="grid-column: 1 / -1; padding: 2.5rem;">
        No prompts found in this category. Click <strong>+ New Prompt</strong> to add your first template!
      </div>
    `;
    return;
  }

  state.prompts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prompt-library-card';
    card.innerHTML = `
      <div class="prompt-card-top">
        <span class="prompt-card-cat-badge">${escapeHtml(p.category || 'Custom')}</span>
        <button type="button" class="btn-del-prompt" data-id="${p.id}" title="Delete Prompt">✕</button>
      </div>
      <h4 class="prompt-card-title">${escapeHtml(p.title)}</h4>
      <p class="prompt-card-body">${escapeHtml(p.content)}</p>
      <div style="margin-top: auto;">
        <button type="button" class="btn-use-prompt">
          <span>Deploy to Chat</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('.btn-use-prompt').addEventListener('click', () => {
      deployPromptToChat(p.content);
    });

    card.querySelector('.btn-del-prompt').addEventListener('click', async () => {
      await deletePrompt(p.id);
    });

    promptsGridContainer.appendChild(card);
  });
}

function deployPromptToChat(text) {
  if (mainChatInput) {
    mainChatInput.value = text;
    switchTab('home');
    mainChatInput.focus();
  }
}

async function handleAddPrompt(e) {
  e.preventDefault();
  const title = promptTitleInput.value.trim();
  const cat = promptCategorySelect.value;
  const content = promptTextInput.value.trim();
  if (!title || !content) return;

  try {
    const res = await fetch(`${API_BASE}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, category: cat, content })
    });

    if (res.ok) {
      addPromptModal.classList.add('hidden');
      await fetchPromptLibrary(state.activePromptCategory);
    }
  } catch (err) {
    console.error('Add prompt error:', err);
  }
}

async function deletePrompt(promptId) {
  try {
    await fetch(`${API_BASE}/api/prompts/${promptId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    await fetchPromptLibrary(state.activePromptCategory);
  } catch (err) {
    console.error('Delete prompt error:', err);
  }
}


// ============================================================
// 9. SETTINGS & AI PROVIDER STATUS
// ============================================================
async function checkProviderHealthStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/providers/status`);
    if (res.ok) {
      const data = await res.json();
      const p = data.providers || {};

      updateProviderTag('statusTagGroq', p.groq);
      updateProviderTag('statusTagOpenRouter', p.openrouter);
      updateProviderTag('statusTagOpenAI', p.openai);
      updateProviderTag('statusTagGemini', p.gemini);
      updateProviderTag('statusTagOllama', p.ollama);

      // Check if at least one cloud provider or ollama is active
      const anyActive = (p.groq && p.groq.configured) ||
                        (p.openrouter && p.openrouter.configured) ||
                        (p.openai && p.openai.configured) ||
                        (p.gemini && p.gemini.configured) ||
                        (p.ollama && p.ollama.status === 'online');

      if (topRoutingStatusPill && topRoutingStatusText) {
        if (anyActive) {
          topRoutingStatusPill.className = 'top-status-pill';
          topRoutingStatusText.textContent = 'Routing Engine Active';
        } else {
          topRoutingStatusPill.className = 'top-status-pill text-muted';
          topRoutingStatusText.textContent = 'Routing Engine Offline';
        }
      }
    }
  } catch (e) {
    console.warn('Provider health check notice:', e);
  }
}

function updateProviderTag(elementId, providerData) {
  const el = document.getElementById(elementId);
  if (!el || !providerData) return;

  if (providerData.type === 'local') {
    if (providerData.status === 'online') {
      el.className = 'provider-status-tag connected';
      el.textContent = '● Online';
    } else {
      el.className = 'provider-status-tag offline';
      el.textContent = '○ Offline';
    }
  } else {
    if (providerData.configured) {
      el.className = 'provider-status-tag connected';
      el.textContent = '● Connected';
    } else {
      el.className = 'provider-status-tag';
      el.textContent = '○ Not configured';
    }
  }
}

async function handleSaveProviderKeys(e) {
  e.preventDefault();
  const groqKey = document.getElementById('inputKeyGroq').value.trim();
  const openrouterKey = document.getElementById('inputKeyOpenRouter').value.trim();
  const openaiKey = document.getElementById('inputKeyOpenAI').value.trim();
  const geminiKey = document.getElementById('inputKeyGemini').value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/settings/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        groq_key: groqKey || undefined,
        openrouter_key: openrouterKey || undefined,
        openai_key: openaiKey || undefined,
        gemini_key: geminiKey || undefined
      })
    });

    if (res.ok) {
      alert('AI Provider credentials successfully updated!');
      await checkProviderHealthStatus();
    }
  } catch (err) {
    console.error('Save keys error:', err);
    alert('Error saving credentials.');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const newName = profileNameInput.value.trim();
  if (!newName) return;

  try {
    const res = await fetch(`${API_BASE}/auth/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName })
    });

    if (res.ok) {
      const data = await res.json();
      setAuthenticatedUser(data.user);
      updateProfileDisplays();
      alert('Profile display name updated!');
    }
  } catch (err) {
    console.error('Profile update error:', err);
  }
}


// ============================================================
// 10. HISTORY MODAL & TIMELINE
// ============================================================
async function openHistoryModal() {
  await fetchWorkspaceConversations();
  if (historyWorkspaceLabel) historyWorkspaceLabel.textContent = `${state.activeWorkspace} Workspace`;
  historyModal.classList.remove('hidden');
  renderHistoryTimeline();
}

function renderHistoryTimeline() {
  if (!historyModalListContainer) return;
  historyModalListContainer.innerHTML = '';
  const convs = state.conversations;

  if (convs.length === 0) {
    historyModalListContainer.innerHTML = `
      <div class="text-center text-muted" style="padding: 2.2rem;">
        No conversations in <strong>${escapeHtml(state.activeWorkspace)}</strong> workspace.<br>
        Ask a question on Home to start your first session!
      </div>
    `;
    return;
  }

  const now = Date.now() / 1000;
  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: []
  };

  convs.forEach(c => {
    const ageSeconds = now - (c.updated_at || c.created_at || now);
    const ageDays = ageSeconds / 86400;

    if (ageDays < 1) groups.Today.push(c);
    else if (ageDays < 2) groups.Yesterday.push(c);
    else if (ageDays < 7) groups['Previous 7 Days'].push(c);
    else groups.Older.push(c);
  });

  Object.keys(groups).forEach(groupName => {
    const list = groups[groupName];
    if (list.length === 0) return;

    const groupDiv = document.createElement('div');
    groupDiv.className = 'history-date-group';
    groupDiv.innerHTML = `<div class="history-date-header">${groupName}</div>`;

    list.forEach(c => {
      const item = document.createElement('div');
      item.className = 'history-conv-item';
      item.innerHTML = `
        <div class="history-item-left">
          <div class="history-item-title">${escapeHtml(c.title || 'Conversation')}</div>
          <div class="history-item-sub">${c.message_count || 1} messages • ${c.model || 'Optimal Routing'}</div>
        </div>
        <div class="history-item-right">
          <button type="button" class="btn-del-conv" data-id="${c.id}" title="Delete Conversation">✕</button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-del-conv')) {
          loadConversation(c.id);
        }
      });

      const delBtn = item.querySelector('.btn-del-conv');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteConversation(c.id);
      });

      groupDiv.appendChild(item);
    });

    historyModalListContainer.appendChild(groupDiv);
  });
}

async function deleteConversation(convId) {
  try {
    await fetch(`${API_BASE}/api/conversations/${convId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (state.activeConversationId === convId) {
      startNewChat();
    }
    await fetchWorkspaceConversations();
    renderHistoryTimeline();
  } catch (e) {
    console.error('Delete conversation error:', e);
  }
}

async function clearAllWorkspaceHistory() {
  if (!confirm(`Are you sure you want to clear all conversations in ${state.activeWorkspace}?`)) return;
  try {
    await fetch(`${API_BASE}/api/conversations?workspace_id=${encodeURIComponent(state.activeWorkspace)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    startNewChat();
    await fetchWorkspaceConversations();
    renderHistoryTimeline();
  } catch (e) {
    console.error('Clear history error:', e);
  }
}


// ============================================================
// 11. THREE.JS 3D VISUALIZERS
// ============================================================
function init3DSphereVisual(canvasId, objHolder) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return;

  const parent = canvas.parentElement;
  const width = parent.clientWidth || 300;
  const height = parent.clientHeight || 200;

  objHolder.scene = new THREE.Scene();
  objHolder.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  objHolder.camera.position.z = 5.2;

  objHolder.renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  objHolder.renderer.setSize(width, height);
  objHolder.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Outer Glossy Sphere
  const sphereGeo = new THREE.SphereGeometry(1.35, 48, 48);
  const sphereMat = new THREE.MeshPhongMaterial({
    color: 0x8b5cf6,
    emissive: 0x4c1d95,
    specular: 0xffffff,
    shininess: 90,
    transparent: true,
    opacity: 0.88
  });
  objHolder.sphere = new THREE.Mesh(sphereGeo, sphereMat);
  objHolder.scene.add(objHolder.sphere);

  // Inner Core
  const innerSphereGeo = new THREE.SphereGeometry(1.0, 32, 32);
  const innerSphereMat = new THREE.MeshBasicMaterial({
    color: 0xa78bfa,
    transparent: true,
    opacity: 0.4
  });
  const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
  objHolder.sphere.add(innerSphere);

  // Orbital Torus Rings
  objHolder.rings = [];
  const ringConfigs = [
    { radius: 2.15, tube: 0.024, color: 0xf59e0b, rotX: 1.1, rotY: 0.3, speed: 0.008 },
    { radius: 2.45, tube: 0.018, color: 0xec4899, rotX: -0.9, rotY: 0.6, speed: -0.006 },
    { radius: 1.95, tube: 0.015, color: 0x7c3aed, rotX: 0.4, rotY: 1.2, speed: 0.01 }
  ];

  ringConfigs.forEach(cfg => {
    const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.75
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = cfg.rotX;
    ringMesh.rotation.y = cfg.rotY;
    ringMesh.userData = { speed: cfg.speed };
    objHolder.scene.add(ringMesh);
    objHolder.rings.push(ringMesh);
  });

  // Orbital Particles
  const partCount = 60;
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(partCount * 3);
  for (let i = 0; i < partCount; i++) {
    const r = 2.2 + Math.random() * 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;
    partPos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
    partPos[i * 3 + 1] = r * Math.sin(phi);
    partPos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
  }
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({
    color: 0xfbbf24,
    size: 0.06,
    transparent: true,
    opacity: 0.8
  });
  objHolder.particles = new THREE.Points(partGeo, partMat);
  objHolder.scene.add(objHolder.particles);

  // Lights
  const ambLight = new THREE.AmbientLight(0xffffff, 0.75);
  objHolder.scene.add(ambLight);

  const dirLight1 = new THREE.DirectionalLight(0xffedd5, 1.2);
  dirLight1.position.set(5, 5, 4);
  objHolder.scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xc084fc, 0.9);
  dirLight2.position.set(-5, -3, 2);
  objHolder.scene.add(dirLight2);

  function animate() {
    if (objHolder.renderer && objHolder.scene && !document.hidden) {
      if (objHolder.sphere) {
        objHolder.sphere.rotation.y += 0.004;
        objHolder.sphere.rotation.x += 0.002;
      }
      objHolder.rings.forEach(r => {
        r.rotation.z += r.userData.speed;
        r.rotation.y += r.userData.speed * 0.5;
      });
      if (objHolder.particles) {
        objHolder.particles.rotation.y += 0.002;
      }
      objHolder.renderer.render(objHolder.scene, objHolder.camera);
    }
    objHolder.animId = requestAnimationFrame(animate);
  }
  animate();
}

function init3DRoutingCoreEngine() {
  const canvas = document.getElementById('routingCore3dCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const parent = canvas.parentElement;
  const width = parent.clientWidth || 600;
  const height = parent.clientHeight || 280;

  routing3D.scene = new THREE.Scene();
  routing3D.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  routing3D.camera.position.z = 4.5;

  routing3D.renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  routing3D.renderer.setSize(width, height);
  routing3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Central Neural Nucleus
  const coreGeometry = new THREE.IcosahedronGeometry(0.9, 1);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
  routing3D.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  routing3D.scene.add(routing3D.coreMesh);

  // Inner Glow
  const innerGeo = new THREE.SphereGeometry(0.5, 24, 24);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.85
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  routing3D.coreMesh.add(innerSphere);

  // Orbital Ring
  const ringGeo = new THREE.TorusGeometry(1.7, 0.02, 16, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6
  });
  routing3D.outerRing = new THREE.Mesh(ringGeo, ringMat);
  routing3D.outerRing.rotation.x = Math.PI / 3;
  routing3D.scene.add(routing3D.outerRing);

  // Satellite Nodes (Green = Fast, Yellow = Normal, Red = Pro)
  const colors = [0x10b981, 0xf59e0b, 0xef4444];
  routing3D.satelliteNodes = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * (Math.PI * 2)) / 3;
    const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: colors[i],
      transparent: true,
      opacity: 0.95
    });
    const satMesh = new THREE.Mesh(nodeGeo, nodeMat);
    satMesh.userData = { angle: angle, radius: 1.7 };
    routing3D.scene.add(satMesh);
    routing3D.satelliteNodes.push(satMesh);
  }

  function animate() {
    if (routing3D.renderer && routing3D.scene && !document.hidden) {
      const speed = routing3D.isRouting ? 0.06 : 0.012;
      if (routing3D.coreMesh) {
        routing3D.coreMesh.rotation.x += speed * 0.7;
        routing3D.coreMesh.rotation.y += speed;
      }
      if (routing3D.outerRing) {
        routing3D.outerRing.rotation.z += speed * 0.5;
      }
      routing3D.satelliteNodes.forEach(node => {
        node.userData.angle += speed * 0.75;
        node.position.x = Math.cos(node.userData.angle) * node.userData.radius;
        node.position.y = Math.sin(node.userData.angle) * 0.65;
        node.position.z = Math.sin(node.userData.angle) * node.userData.radius * 0.7;
      });
      routing3D.renderer.render(routing3D.scene, routing3D.camera);
    }
    routing3D.animId = requestAnimationFrame(animate);
  }
  animate();
}

function trigger3DRoutingBurst(tier) {
  routing3D.isRouting = true;
  if (routing3D.coreMesh) {
    const targetColor = tier === 'cheap' ? 0x10b981 : (tier === 'normal' ? 0xf59e0b : 0xec4899);
    routing3D.coreMesh.material.color.setHex(targetColor);
  }

  setTimeout(() => {
    routing3D.isRouting = false;
    if (routing3D.coreMesh) {
      routing3D.coreMesh.material.color.setHex(0x7c3aed);
    }
  }, 1800);
}


// ============================================================
// 12. EVENT LISTENERS & NAVIGATION
// ============================================================
function initEventListeners() {
  // Bind Google OAuth Login URL dynamically to API_BASE
  if (btnGoogleSignIn) {
    btnGoogleSignIn.href = `${API_BASE}/auth/google/login`;
  }

  // Auth Form Handlers
  if (btnEmailSignInToggle) {
    btnEmailSignInToggle.addEventListener('click', () => {
      emailLoginForm.classList.toggle('hidden');
      if (!emailLoginForm.classList.contains('hidden')) {
        emailAuthInput.focus();
      }
    });
  }

  if (emailLoginForm) {
    emailLoginForm.addEventListener('submit', handleEmailLogin);
  }

  // Sidebar Collapse
  if (btnCollapseSidebar) {
    btnCollapseSidebar.addEventListener('click', () => {
      sidebarLeft.classList.toggle('collapsed');
    });
  }

  // Navigation Tabs
  navHome.addEventListener('click', () => switchTab('home'));
  navExplore.addEventListener('click', () => switchTab('explore'));
  navImpact.addEventListener('click', () => switchTab('impact'));
  navPromptLib.addEventListener('click', () => switchTab('prompts'));
  navRoutingCore.addEventListener('click', () => switchTab('routing-core'));
  navAnalyticsSidebar.addEventListener('click', () => switchTab('analytics'));

  // Modals Openers
  btnOpenSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    checkProviderHealthStatus();
  });
  if (topProfileBtn) {
    topProfileBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
      switchSettingsTab('account');
    });
  }
  btnOpenHelp.addEventListener('click', () => helpModal.classList.remove('hidden'));
  btnOpenHistory.addEventListener('click', openHistoryModal);
  btnUpgradePro.addEventListener('click', () => plansModal.classList.remove('hidden'));

  // Chat Submission & Key Bindings
  mainChatForm.addEventListener('submit', handleChatSubmit);
  mainChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      mainChatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  if (btnNewChatInline) {
    btnNewChatInline.addEventListener('click', startNewChat);
  }

  // Mode Selection inside Composer
  tierBtnFast.addEventListener('click', () => setMode('fast'));
  tierBtnPro.addEventListener('click', () => setMode('pro'));
  tierBtnAuto.addEventListener('click', () => setMode('auto'));

  // Use Context Toggle
  useContextToggle.addEventListener('change', (e) => {
    state.useContext = e.target.checked;
  });

  // Attach Document
  btnAttach.addEventListener('click', () => fileAttachmentInput.click());
  fileAttachmentInput.addEventListener('change', handleFileUpload);

  // Search Toggle
  btnSearch.addEventListener('click', () => {
    state.searchActive = !state.searchActive;
    if (state.searchActive) {
      btnSearch.classList.add('active');
      btnSearchLabel.textContent = 'Search: ON';
    } else {
      btnSearch.classList.remove('active');
      btnSearchLabel.textContent = 'Search';
    }
  });

  // Quick Action Cards
  document.querySelectorAll('.quick-action-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) deployPromptToChat(prompt);
    });
  });

  // Explore Prompt Chips
  document.querySelectorAll('.tier-chip-trigger').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) deployPromptToChat(prompt);
    });
  });

  // Global Search
  globalSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = globalSearchInput.value.trim();
      if (q) {
        deployPromptToChat(q);
        globalSearchInput.value = '';
      }
    }
  });

  // Ctrl + K Focus Search Shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      globalSearchInput.focus();
    }
  });

  // Workspaces Modal
  createWorkspaceBtn.addEventListener('click', () => {
    createWorkspaceModal.classList.remove('hidden');
    wsNameInput.value = '';
    wsNameInput.focus();
  });
  closeWsModalBtn.addEventListener('click', () => createWorkspaceModal.classList.add('hidden'));
  createWorkspaceForm.addEventListener('submit', handleCreateWorkspace);

  // Prompts Modal
  openAddPromptModalBtn.addEventListener('click', () => {
    addPromptModal.classList.remove('hidden');
    promptTitleInput.value = '';
    promptTextInput.value = '';
    promptTitleInput.focus();
  });
  closePromptModalBtn.addEventListener('click', () => addPromptModal.classList.add('hidden'));
  addPromptForm.addEventListener('submit', handleAddPrompt);

  // Settings Modal Tabs & Submissions
  tabBtnAiProviders.addEventListener('click', () => switchSettingsTab('providers'));
  tabBtnAccount.addEventListener('click', () => switchSettingsTab('account'));
  tabBtnPreferences.addEventListener('click', () => switchSettingsTab('preferences'));
  closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  providerSettingsForm.addEventListener('submit', handleSaveProviderKeys);
  btnRefreshProviderStatus.addEventListener('click', checkProviderHealthStatus);
  profileEditForm.addEventListener('submit', handleProfileUpdate);

  // Logout Button
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`);
    } catch (e) {}
    state.authenticated = false;
    showAuthScreen();
    settingsModal.classList.add('hidden');
  });

  // Plans Modal
  closePlansModalBtn.addEventListener('click', () => plansModal.classList.add('hidden'));
  btnConfirmUpgradePro.addEventListener('click', () => {
    alert('Thank you! Your workspace has been upgraded to NEXORA PRO.');
    state.user.plan = 'Pro Plan';
    plansModal.classList.add('hidden');
  });

  // History Modal
  closeHistoryModalBtn.addEventListener('click', () => historyModal.classList.add('hidden'));
  clearAllHistoryBtn.addEventListener('click', clearAllWorkspaceHistory);

  // Help Modal
  closeHelpModalBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

  // Refresh Buttons
  refreshImpactBtn.addEventListener('click', () => {
    fetchBackendMetrics();
    renderImpactPage();
  });
  refreshAnalyticsBtn.addEventListener('click', () => {
    fetchBackendMetrics();
    renderAnalyticsAudit();
  });

  // Theme Toggle
  btnToggleTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  // Close Modals on Backdrop Click
  [createWorkspaceModal, addPromptModal, settingsModal, plansModal, historyModal, helpModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
  });
}

function setMode(mode) {
  state.activeMode = mode;
  [tierBtnFast, tierBtnPro, tierBtnAuto].forEach(b => {
    if (b) b.classList.remove('active');
  });

  if (mode === 'fast' && tierBtnFast) tierBtnFast.classList.add('active');
  else if (mode === 'pro' && tierBtnPro) tierBtnPro.classList.add('active');
  else if (tierBtnAuto) tierBtnAuto.classList.add('active');
}

function switchTab(tabName) {
  state.currentTab = tabName;

  Object.keys(views).forEach(k => {
    if (views[k]) {
      if (k === tabName) {
        views[k].classList.remove('hidden');
        views[k].classList.add('active');
      } else {
        views[k].classList.add('hidden');
        views[k].classList.remove('active');
      }
    }
  });

  [navHome, navExplore, navImpact, navPromptLib, navRoutingCore, navAnalyticsSidebar].forEach(b => {
    if (b) b.classList.remove('active');
  });

  if (tabName === 'home') navHome.classList.add('active');
  else if (tabName === 'explore') navExplore.classList.add('active');
  else if (tabName === 'impact') {
    navImpact.classList.add('active');
    renderImpactPage();
  } else if (tabName === 'prompts') {
    navPromptLib.classList.add('active');
    renderPromptsGrid();
  } else if (tabName === 'routing-core') {
    navRoutingCore.classList.add('active');
  } else if (tabName === 'analytics') {
    navAnalyticsSidebar.classList.add('active');
    renderAnalyticsAudit();
  }
}

function switchSettingsTab(tabName) {
  [tabBtnAiProviders, tabBtnAccount, tabBtnPreferences].forEach(b => b.classList.remove('active'));
  [settingsTabProviders, settingsTabAccount, settingsTabPreferences].forEach(p => p.classList.add('hidden'));

  if (tabName === 'providers') {
    tabBtnAiProviders.classList.add('active');
    settingsTabProviders.classList.remove('hidden');
  } else if (tabName === 'account') {
    tabBtnAccount.classList.add('active');
    settingsTabAccount.classList.remove('hidden');
  } else if (tabName === 'preferences') {
    tabBtnPreferences.classList.add('active');
    settingsTabPreferences.classList.remove('hidden');
  }
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    state.attachedFile = {
      name: file.name,
      content: evt.target.result
    };
    renderAttachmentChip();
  };
  reader.readAsText(file);
}

function renderAttachmentChip() {
  if (!state.attachedFile) {
    attachmentChipContainer.innerHTML = '';
    attachmentChipContainer.classList.add('hidden');
    return;
  }

  attachmentChipContainer.classList.remove('hidden');
  attachmentChipContainer.innerHTML = `
    <div class="attachment-chip">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>${escapeHtml(state.attachedFile.name)}</span>
      <button type="button" class="btn-remove-chip" id="btnRemoveChip">✕</button>
    </div>
  `;

  document.getElementById('btnRemoveChip').addEventListener('click', clearAttachment);
}

function clearAttachment() {
  state.attachedFile = null;
  fileAttachmentInput.value = '';
  renderAttachmentChip();
}


// ============================================================
// UTILITIES
// ============================================================
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```python([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/```javascript([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/```html([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/```css([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function truncate(str, max = 30) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
