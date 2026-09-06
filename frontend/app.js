/**
 * NEXORA - AI Optimization Engine
 * Master 14-Screen Platform Application Logic
 *
 * Configured for:
 * - Vercel Frontend: https://nexora-sepia-psi.vercel.app/
 * - Render Backend: https://nexora-backend-gcjd.onrender.com
 */

// ============================================================
// 1. BACKEND API CONFIGURATION
// ============================================================

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '8000' ? '' : 'http://127.0.0.1:8000')
  : 'https://nexora-backend-gcjd.onrender.com';

console.log('[NEXORA] Connected API_BASE:', API_BASE || '(same-origin)');


// ============================================================
// 2. GLOBAL APPLICATION STATE
// ============================================================

const state = {
  authenticated: false,
  user: {
    id: 'default_user',
    name: 'Mounika',
    first_name: 'Mounika',
    email: 'mounika@example.com',
    picture: '',
    plan: 'Free Plan',
    provider: 'google'
  },
  activeWorkspace: 'Personal',
  currentTab: 'home',
  activeConversationId: null,
  activeConversationTitle: null,
  activeMode: 'auto',
  useContext: true,
  searchActive: false,
  attachedFile: null,
  lastTelemetryData: null,
  workspaces: [
    { name: 'Personal', description: 'Personal research and daily queries' },
    { name: 'College', description: 'Academic coursework and assignments' },
    { name: 'Research', description: 'Deep technical synthesis' },
    { name: 'Hackathons', description: 'Rapid MVP roadmaps and competitive coding' }
  ],
  conversations: [],
  prompts: [
    { id: 'p1', title: 'Research Paper Summarizer', category: 'Research', target_tier: 'PRO', content: 'Summarize this research paper, identify its key contributions, methodologies, and limitations in structured bullet points.' },
    { id: 'p2', title: 'Explain Complex Code', category: 'Coding', target_tier: 'FAST', content: 'Explain this code snippet step-by-step. Highlight the algorithmic logic, edge cases, and time/space complexity.' },
    { id: 'p3', title: 'Generate Study Notes', category: 'Academic', target_tier: 'FAST', content: 'Generate structured revision notes for this topic with key definitions, formulas, and 3 practice review questions.' },
    { id: 'p4', title: 'Analyze Dataset', category: 'Analysis', target_tier: 'PRO', content: 'Analyze this dataset summary. Suggest optimal statistical models, identify anomalies, and recommend feature engineering steps.' },
    { id: 'p5', title: 'Create Project Proposal', category: 'Business', target_tier: 'BALANCED', content: 'Draft a comprehensive project proposal including problem statement, executive summary, tech architecture, and roadmap.' },
    { id: 'p6', title: 'Debug Python Code', category: 'Coding', target_tier: 'FAST', content: 'Identify the bug in this Python code, explain why the error occurred, and provide the optimized corrected version.' },
    { id: 'p7', title: 'RAG Knowledge Synthesis', category: 'RAG', target_tier: 'PRO', content: 'Synthesize insights from the uploaded knowledge documents to answer: ' },
    { id: 'p8', title: 'Compare AI Models', category: 'Research', target_tier: 'BALANCED', content: 'Compare GPT-4o, Claude 3.5 Sonnet, and Llama 3.3 on speed, pricing per million tokens, and reasoning benchmarks.' }
  ],
  activePromptCategory: 'All',
  ragDocuments: [],
  telemetry: {
    totalRequests: 1284,
    totalTokens: 2400000,
    totalCost: 12.42,
    totalSavings: 31.87,
    savingsPercentage: 69.4,
    averageLatency: 2.8,
    efficiency: 94.6
  }
};


// ============================================================
// 3. DOM ELEMENTS CACHE
// ============================================================

const authScreen = document.getElementById('authScreen');
const authLoadingScreen = document.getElementById('authLoadingScreen');
const dashboardScreen = document.getElementById('dashboardScreen');

const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
const btnEmailSignInToggle = document.getElementById('btnEmailSignInToggle');
const emailLoginForm = document.getElementById('emailLoginForm');
const emailAuthInput = document.getElementById('emailAuthInput');
const nameAuthInput = document.getElementById('nameAuthInput');

const topWorkspaceBreadcrumb = document.getElementById('topWorkspaceBreadcrumb');
const activeWsWelcomeName = document.getElementById('activeWsWelcomeName');
const topSessionSavedPct = document.getElementById('topSessionSavedPct');
const userNameDisplay = document.getElementById('userNameDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userAvatarInitial = document.getElementById('userAvatarInitial');
const topAvatarLetter = document.getElementById('topAvatarLetter');
const workspaceList = document.getElementById('workspaceList');
const wsCountBadge = document.getElementById('wsCountBadge');

const chatStream = document.getElementById('chatStream');
const chatLoadingState = document.getElementById('chatLoadingState');
const loadingStepText = document.getElementById('loadingStepText');
const mainChatForm = document.getElementById('mainChatForm');
const mainChatInput = document.getElementById('mainChatInput');
const fileAttachmentInput = document.getElementById('fileAttachmentInput');
const attachmentChipContainer = document.getElementById('attachmentChipContainer');
const btnAttach = document.getElementById('btnAttach');
const btnSearch = document.getElementById('btnSearch');
const useContextToggle = document.getElementById('useContextToggle');
const smartRouterPill = document.getElementById('smartRouterPill');
const btnNewChat = document.getElementById('btnNewChat');
const activeConvHeaderPill = document.getElementById('activeConvHeaderPill');
const activeConvTitleDisplay = document.getElementById('activeConvTitleDisplay');
const btnNewChatInline = document.getElementById('btnNewChatInline');

// Modals
const modalTelemetry = document.getElementById('modalTelemetry');
const modalWorkspace = document.getElementById('modalWorkspace');
const modalPrompt = document.getElementById('modalPrompt');
const modalProfile = document.getElementById('modalProfile');


// ============================================================
// 4. AUTHENTICATION LIFECYCLE
// ============================================================

if (btnGoogleSignIn) {
  const directGoogleUrl = `${API_BASE || 'https://nexora-backend-gcjd.onrender.com'}/auth/google/login`;
  btnGoogleSignIn.href = directGoogleUrl;
}

async function initGoogleGsiConfig() {
  try {
    const res = await fetch(`${API_BASE}/auth/config`, { method: 'GET', credentials: 'include' });
    if (res.ok) {
      const config = await res.json();
      if (config && config.google_client_id && !config.google_client_id.startsWith('YOUR_GOOGLE')) {
        const slot = document.getElementById('g_id_onload');
        if (slot) slot.setAttribute('data-client_id', config.google_client_id);
      }
    }
  } catch (e) {
    console.warn('[NEXORA] Google config fetch warning:', e);
  }
}

async function checkSessionAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store'
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.authenticated === true && data.user) {
      setAuthenticatedUser(data.user);
      return true;
    }
  } catch (e) {
    console.warn('[NEXORA] Session check notice:', e);
  }
  return false;
}

function setAuthenticatedUser(userData) {
  if (!userData) return;
  state.authenticated = true;
  state.user = {
    id: userData.id || userData.email || 'user',
    name: userData.name || 'User',
    first_name: userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'User'),
    email: userData.email || 'user@nexora.ai',
    picture: userData.picture || '',
    plan: userData.plan || 'Free Plan',
    provider: userData.provider || 'email'
  };

  updateUserProfileUI();
}

function showAuthScreen() {
  state.authenticated = false;
  if (authLoadingScreen) authLoadingScreen.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.classList.add('hidden');
  if (authScreen) authScreen.classList.remove('hidden');
}

function showLoadingScreen() {
  if (authScreen) authScreen.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.classList.add('hidden');
  if (authLoadingScreen) authLoadingScreen.classList.remove('hidden');
}

function transitionToDashboard() {
  if (authScreen) authScreen.classList.add('hidden');
  if (authLoadingScreen) authLoadingScreen.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.classList.remove('hidden');
  updateUserProfileUI();
  updateWorkspaceUI();
  initAll3DCanvases();
  renderAllCharts();
}

async function runAuthLoadingSequence() {
  showLoadingScreen();
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`checkStep${i}`);
    if (el) {
      const b = el.querySelector('.check-badge');
      if (b) b.classList.add('active');
    }
    await new Promise(r => setTimeout(r, 100));
  }
  await Promise.allSettled([loadWorkspaces(), loadConversations(), loadRAGDocuments(), loadBackendMetrics()]);
  transitionToDashboard();
}

window.handleGoogleCredentialResponse = async function (response) {
  if (!response || !response.credential) return;
  try {
    showLoadingScreen();
    const result = await fetch(`${API_BASE}/auth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await result.json().catch(() => ({}));
    if (result.ok && data && data.user) {
      setAuthenticatedUser(data.user);
      await runAuthLoadingSequence();
      return;
    }
    throw new Error(data.detail || 'Google authentication failed');
  } catch (err) {
    alert('Google authentication failed. Please try again.');
    showAuthScreen();
  }
};

if (emailLoginForm) {
  emailLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailAuthInput ? emailAuthInput.value.trim() : '';
    const name = nameAuthInput ? nameAuthInput.value.trim() : '';
    if (!email) return;

    showLoadingScreen();
    try {
      const res = await fetch(`${API_BASE}/auth/email/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email, name: name || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.user) {
        setAuthenticatedUser(data.user);
        await runAuthLoadingSequence();
      } else {
        alert(data.detail || 'Sign-in failed.');
        showAuthScreen();
      }
    } catch (err) {
      alert('Network error connecting to backend.');
      showAuthScreen();
    }
  });
}

if (btnEmailSignInToggle) {
  btnEmailSignInToggle.addEventListener('click', () => {
    if (emailLoginForm) {
      emailLoginForm.classList.toggle('hidden');
      if (!emailLoginForm.classList.contains('hidden') && emailAuthInput) emailAuthInput.focus();
    }
  });
}

async function logoutNexora() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {}
  state.authenticated = false;
  showAuthScreen();
}


// ============================================================
// 5. VIEW ROUTER (ALL 14 SCREENS)
// ============================================================

function switchTab(tabId) {
  state.currentTab = tabId;

  // Sidebar buttons active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Workspace items active state
  document.querySelectorAll('.workspace-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabId || (tabId === 'home' && item.dataset.ws === state.activeWorkspace));
  });

  const tabViewMap = {
    'home': 'viewHome',
    'explore': 'viewExplore',
    'prompts': 'viewPrompts',
    'history': 'viewHistory',
    'impact': 'viewImpact',
    'knowledge': 'viewKnowledge',
    'before': 'viewBefore',
    'after': 'viewAfter',
    'ws-personal': 'viewWsPersonal',
    'ws-college': 'viewWsCollege',
    'ws-research': 'viewWsResearch',
    'ws-hackathon': 'viewWsHackathon',
    'settings': 'viewSettings'
  };

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('active');
  });

  const targetId = tabViewMap[tabId] || 'viewHome';
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('active');
  }

  // Update top workspace breadcrumb
  const wsMap = {
    'ws-personal': 'Personal Workspace',
    'ws-college': 'College Workspace',
    'ws-research': 'Research Workspace',
    'ws-hackathon': 'Hackathon Workspace'
  };
  if (wsMap[tabId]) {
    state.activeWorkspace = tabId.replace('ws-', '').charAt(0).toUpperCase() + tabId.replace('ws-', '').slice(1);
    if (tabId === 'ws-hackathon') state.activeWorkspace = 'Hackathons';
    updateWorkspaceUI();
  }

  // Trigger sub-view updates & animations
  if (tabId === 'prompts') renderPromptLibrary();
  if (tabId === 'history') loadConversations();
  if (tabId === 'impact') { loadBackendMetrics(); renderAllCharts(); }
  if (tabId === 'knowledge') loadRAGDocuments();

  // Lazy trigger 3D visualizers for the active view
  triggerView3D(tabId);
}

// Bind Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab) switchTab(tab);
  });
});

document.querySelectorAll('.workspace-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    const ws = item.dataset.ws;
    if (ws) state.activeWorkspace = ws;
    if (tab) switchTab(tab);
    else switchWorkspace(ws);
  });
});

const btnOpenAnalyticsTop = document.getElementById('btnOpenAnalyticsTop');
if (btnOpenAnalyticsTop) {
  btnOpenAnalyticsTop.addEventListener('click', () => switchTab('impact'));
}


// ============================================================
// 6. WORKSPACES & DATA MANAGERS
// ============================================================

function updateUserProfileUI() {
  const initial = (state.user.first_name || 'M').charAt(0).toUpperCase();
  if (userNameDisplay) userNameDisplay.textContent = state.user.name || 'Mounika';
  if (userEmailDisplay) userEmailDisplay.textContent = state.user.plan || 'Free Plan';
  if (userAvatarInitial) userAvatarInitial.textContent = initial;
  if (topAvatarLetter) topAvatarLetter.textContent = initial;

  const modalName = document.getElementById('modalProfileName');
  const modalEmail = document.getElementById('modalProfileEmail');
  const modalInitial = document.getElementById('modalProfileInitial');
  if (modalName) modalName.textContent = state.user.name || 'Mounika';
  if (modalEmail) modalEmail.textContent = state.user.email || 'mounika@example.com';
  if (modalInitial) modalInitial.textContent = initial;
}

function updateWorkspaceUI() {
  if (topWorkspaceBreadcrumb) topWorkspaceBreadcrumb.textContent = `${state.activeWorkspace} Workspace`;
  if (activeWsWelcomeName) activeWsWelcomeName.textContent = state.activeWorkspace;
}

async function loadWorkspaces() {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces`, { method: 'GET', credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.workspaces) state.workspaces = data.workspaces;
    }
  } catch (e) {}
}

function switchWorkspace(name) {
  state.activeWorkspace = name;
  state.activeConversationId = null;
  state.activeConversationTitle = null;
  updateWorkspaceUI();
  resetChatToWelcome();
  switchTab('home');
  loadConversations();
}


// ============================================================
// 7. CHAT EXECUTION & SMART ROUTING PIPELINE
// ============================================================

if (mainChatForm) {
  mainChatForm.addEventListener('submit', handleChatSubmit);
}

if (mainChatInput) {
  mainChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      mainChatForm.dispatchEvent(new Event('submit'));
    }
  });
}

if (btnNewChat) {
  btnNewChat.addEventListener('click', () => {
    state.activeConversationId = null;
    state.activeConversationTitle = null;
    resetChatToWelcome();
    switchTab('home');
    if (mainChatInput) mainChatInput.focus();
  });
}

if (btnNewChatInline) {
  btnNewChatInline.addEventListener('click', () => {
    state.activeConversationId = null;
    state.activeConversationTitle = null;
    resetChatToWelcome();
    if (mainChatInput) mainChatInput.focus();
  });
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const query = mainChatInput ? mainChatInput.value.trim() : '';
  if (!query) return;

  mainChatInput.value = '';
  mainChatInput.style.height = 'auto';

  const defaultCard = document.getElementById('defaultWelcomeCard');
  if (defaultCard) defaultCard.remove();

  appendUserMessageCard(query);

  if (chatLoadingState) {
    if (loadingStepText) {
      loadingStepText.textContent = state.attachedFile
        ? 'NEXORA is retrieving knowledge base & routing...'
        : 'NEXORA is thinking...';
    }
    chatLoadingState.classList.remove('hidden');
  }
  if (chatStream) chatStream.scrollTop = chatStream.scrollHeight;

  try {
    const payload = {
      message: query,
      conversation_id: state.activeConversationId,
      workspace_id: state.activeWorkspace,
      mode: state.activeMode || 'auto',
      use_context: useContextToggle ? useContextToggle.checked : true,
      use_search: state.searchActive
    };

    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (chatLoadingState) chatLoadingState.classList.add('hidden');

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      appendAssistantMessageCard(`⚠️ Inference Notice: ${errData.detail || 'Could not complete inference.'}`, { model: 'System', savings: 0, cost: 0 });
      return;
    }

    const data = await res.json();
    state.activeConversationId = data.conversation_id;
    state.activeConversationTitle = data.conversation_title;

    if (activeConvHeaderPill && activeConvTitleDisplay) {
      activeConvTitleDisplay.textContent = data.conversation_title || 'Active Chat';
      activeConvHeaderPill.classList.remove('hidden');
    }

    if (topSessionSavedPct && data.cost_saved_percent) {
      topSessionSavedPct.textContent = `${data.cost_saved_percent}%`;
    }

    state.lastTelemetryData = data;
    appendAssistantMessageCard(data.answer, data);
    loadConversations();
    loadBackendMetrics();

  } catch (error) {
    if (chatLoadingState) chatLoadingState.classList.add('hidden');
    appendAssistantMessageCard('⚠️ Network Notice: Unable to reach the Nexora backend. Please verify your connection.', { model: 'Network' });
  }

  if (chatStream) chatStream.scrollTop = chatStream.scrollHeight;
}

function appendUserMessageCard(text) {
  if (!chatStream) return;
  const card = document.createElement('div');
  card.className = 'chat-message-card user-card';
  card.innerHTML = `
    <div class="msg-card-header">
      <div class="msg-header-left">
        <span class="msg-model-title">You (${escapeHtml(state.user.first_name || 'User')})</span>
      </div>
    </div>
    <div class="msg-card-body">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
  `;
  chatStream.appendChild(card);
}

function appendAssistantMessageCard(text, meta = {}) {
  if (!chatStream) return;
  const card = document.createElement('div');
  card.className = 'chat-message-card assistant-card';

  const modelLabel = meta.model || meta.recommended_model || 'NEXORA AI • Haiku / Small (FAST)';
  const formattedHtml = formatMarkdownResponse(text);

  let ragSnippetHtml = '';
  if (meta.rag_used && meta.rag_chunks && meta.rag_chunks.length > 0) {
    const chunkCount = meta.rag_chunks.length;
    const docName = meta.rag_chunks[0].document_name || 'Knowledge Base';
    ragSnippetHtml = `
      <div class="rag-context-preview-box">
        <div class="rag-context-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <span>📄 RAG Context: ${chunkCount} relevant chunk${chunkCount > 1 ? 's' : ''} retrieved from "${escapeHtml(docName)}"</span>
          <span style="font-size: 0.72rem;">(click to toggle)</span>
        </div>
        <div class="rag-context-body hidden">
          ${meta.rag_chunks.map((c, i) => `<p><strong>[Chunk ${i + 1} - Score ${(c.score * 100).toFixed(1)}%]:</strong> ${escapeHtml(c.text)}</p>`).join('')}
        </div>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="msg-card-header">
      <div class="msg-header-left">
        <span class="model-badge-lightning">⚡</span>
        <span class="msg-model-title">${escapeHtml(modelLabel)}</span>
      </div>
      <button type="button" class="btn-copy-card-top" title="Copy response">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
    </div>
    <div class="msg-card-body">
      ${formattedHtml}
      ${ragSnippetHtml}
    </div>
    <div class="msg-card-actions">
      <button type="button" class="btn-card-action btn-copy-msg"><span>Copy</span></button>
      <button type="button" class="btn-card-action btn-regen-msg"><span>Regenerate</span></button>
      <button type="button" class="btn-inspect-telemetry">
        <span>Inspect routing telemetry</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  `;

  card._meta = meta;
  card._rawText = text;
  attachCardEvents(card);
  chatStream.appendChild(card);
}

function attachCardEvents(card) {
  if (!card) return;
  const copyTop = card.querySelector('.btn-copy-card-top');
  const copyBtn = card.querySelector('.btn-copy-msg');
  const telemBtn = card.querySelector('.btn-inspect-telemetry');

  const copyAction = () => {
    const raw = card._rawText || card.querySelector('.msg-card-body')?.innerText || '';
    navigator.clipboard.writeText(raw);
    alert('Copied response to clipboard!');
  };

  if (copyTop) copyTop.addEventListener('click', copyAction);
  if (copyBtn) copyBtn.addEventListener('click', copyAction);
  if (telemBtn) telemBtn.addEventListener('click', () => openTelemetryModal(card._meta || state.lastTelemetryData || {}));
}

function resetChatToWelcome() {
  if (!chatStream) return;
  chatStream.innerHTML = `
    <div class="chat-message-card assistant-card" id="defaultWelcomeCard">
      <div class="msg-card-header">
        <div class="msg-header-left">
          <span class="model-badge-lightning">⚡</span>
          <span class="msg-model-title">NEXORA AI • Haiku / Small (FAST)</span>
        </div>
      </div>
      <div class="msg-card-body">
        Hello! How can I assist you in your <strong>${escapeHtml(state.activeWorkspace)}</strong> workspace today? 😊
      </div>
    </div>
  `;
  if (activeConvHeaderPill) activeConvHeaderPill.classList.add('hidden');
}


// ============================================================
// 8. RAG KNOWLEDGE BASE & DOCUMENT UPLOADS
// ============================================================

if (btnAttach && fileAttachmentInput) {
  btnAttach.addEventListener('click', () => fileAttachmentInput.click());
  fileAttachmentInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await uploadDocumentFile(file);
  });
}

const btnUploadDocCenter = document.getElementById('btnUploadDocCenter');
const knowledgeDropzone = document.getElementById('knowledgeDropzone');

if (btnUploadDocCenter && fileAttachmentInput) {
  btnUploadDocCenter.addEventListener('click', (e) => {
    e.stopPropagation();
    fileAttachmentInput.click();
  });
}
if (knowledgeDropzone && fileAttachmentInput) {
  knowledgeDropzone.addEventListener('click', () => fileAttachmentInput.click());
}

async function uploadDocumentFile(file) {
  if (attachmentChipContainer) {
    attachmentChipContainer.innerHTML = `<div class="attachment-chip"><span>⏳ Indexing ${escapeHtml(file.name)}...</span></div>`;
    attachmentChipContainer.classList.remove('hidden');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', state.activeWorkspace);

  try {
    const res = await fetch(`${API_BASE}/api/rag/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.status === 'success') {
      state.attachedFile = data.document;
      if (attachmentChipContainer) {
        attachmentChipContainer.innerHTML = `
          <div class="attachment-chip">
            <span><strong>${escapeHtml(data.document.filename)}</strong> (${data.document.chunk_count} chunks indexed)</span>
            <button type="button" class="btn-remove-attachment" onclick="clearAttachment()">×</button>
          </div>
        `;
      }
      loadRAGDocuments();
    } else {
      alert(data.detail || 'Failed to process document.');
      clearAttachment();
    }
  } catch (err) {
    alert('Network error while indexing document.');
    clearAttachment();
  }
}

function clearAttachment() {
  state.attachedFile = null;
  if (fileAttachmentInput) fileAttachmentInput.value = '';
  if (attachmentChipContainer) {
    attachmentChipContainer.innerHTML = '';
    attachmentChipContainer.classList.add('hidden');
  }
}

async function loadRAGDocuments() {
  try {
    const res = await fetch(`${API_BASE}/api/rag/documents?workspace_id=${encodeURIComponent(state.activeWorkspace)}`, {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.documents) {
        state.ragDocuments = data.documents;
        renderKnowledgeDocuments();
      }
    }
  } catch (e) {}
}

function renderKnowledgeDocuments() {
  const container = document.getElementById('knowledgeDocsList');
  const countBadge = document.getElementById('docCountBadge');
  if (!container) return;
  container.innerHTML = '';

  if (countBadge) countBadge.textContent = `${state.ragDocuments.length} Documents`;

  if (state.ragDocuments.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 1.5rem; color: var(--text-muted);">No indexed documents in <strong>${escapeHtml(state.activeWorkspace)}</strong> yet.</div>`;
    return;
  }

  state.ragDocuments.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'doc-card-row';
    row.innerHTML = `
      <div class="doc-card-info">
        <span style="font-size: 1.2rem;">📄</span>
        <div>
          <strong>${escapeHtml(doc.filename)}</strong>
          <span>${doc.chunk_count} chunks • ${doc.workspace_id || 'Workspace'}</span>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <span class="status-badge-connected">Ready</span>
        <button type="button" class="btn-del-conv" data-id="${doc.id}">Delete</button>
      </div>
    `;
    row.querySelector('.btn-del-conv').addEventListener('click', async () => {
      if (!confirm(`Delete ${doc.filename}?`)) return;
      await fetch(`${API_BASE}/api/rag/documents/${doc.id}`, { method: 'DELETE', credentials: 'include' });
      loadRAGDocuments();
    });
    container.appendChild(row);
  });
}


// ============================================================
// 9. PROMPTS, EXPLORE, HISTORY & ANALYTICS
// ============================================================

function renderPromptLibrary() {
  const container = document.getElementById('promptsContainer');
  if (!container) return;
  container.innerHTML = '';

  const filtered = state.activePromptCategory === 'All'
    ? state.prompts
    : state.prompts.filter(p => p.category.toLowerCase() === state.activePromptCategory.toLowerCase());

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prompt-card-clean';
    card.innerHTML = `
      <div class="prompt-card-header">
        <span class="prompt-category-badge">${escapeHtml(p.category || 'Custom')}</span>
        <span class="prompt-tier-tag">${escapeHtml(p.target_tier || 'FAST')}</span>
      </div>
      <h3 class="prompt-title">${escapeHtml(p.title)}</h3>
      <p class="prompt-preview">${escapeHtml(p.content)}</p>
      <button type="button" class="btn-use-prompt">Use Prompt →</button>
    `;
    card.querySelector('.btn-use-prompt').addEventListener('click', () => {
      if (mainChatInput) {
        mainChatInput.value = p.content;
        switchTab('home');
        mainChatInput.focus();
      }
    });
    container.appendChild(card);
  });
}

// Category filter clicks in Prompt Library
document.querySelectorAll('.cat-chip[data-cat]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.cat-chip[data-cat]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.activePromptCategory = chip.dataset.cat;
    renderPromptLibrary();
  });
});

// Explore Cards action binding
document.querySelectorAll('.explore-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    const action = card.dataset.action;
    if (action === 'rag' || action === 'doc') {
      switchTab('knowledge');
    } else if (action === 'analytics') {
      switchTab('impact');
    } else if (prompt && mainChatInput) {
      mainChatInput.value = prompt;
      switchTab('home');
      mainChatInput.focus();
    }
  });
});

// Feature chips & Recent Conversations on Home Page
document.querySelectorAll('.welcome-chip, .recent-conv-chip, .ws-feat-card, .study-tool-card, .research-tool-card').forEach(el => {
  el.addEventListener('click', () => {
    const prompt = el.dataset.prompt;
    const action = el.dataset.action;
    if (action === 'rag') {
      switchTab('knowledge');
    } else if (prompt && mainChatInput) {
      mainChatInput.value = prompt;
      switchTab('home');
      mainChatInput.focus();
    }
  });
});

// Subject pills in College Workspace
document.querySelectorAll('.subject-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.subject-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const subj = pill.dataset.subject;
    if (mainChatInput) {
      mainChatInput.value = `Explain the core concepts and fundamental topics in ${subj}.`;
      switchTab('home');
      mainChatInput.focus();
    }
  });
});

async function loadConversations() {
  try {
    const res = await fetch(`${API_BASE}/api/conversations?workspace_id=${encodeURIComponent(state.activeWorkspace)}`, {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.conversations) {
        state.conversations = data.conversations;
        renderHistoryList();
      }
    }
  } catch (e) {}
}

function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;
  container.innerHTML = '';

  if (state.conversations.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No saved conversations in <strong>${escapeHtml(state.activeWorkspace)}</strong> workspace yet.</div>`;
    return;
  }

  state.conversations.forEach(conv => {
    const row = document.createElement('div');
    row.className = 'history-conv-row';
    row.innerHTML = `
      <div class="history-conv-info">
        <h4>${escapeHtml(conv.title)}</h4>
        <span class="history-conv-date">${new Date(conv.updated_at * 1000).toLocaleString()} • ${conv.messages ? conv.messages.length : 0} messages</span>
      </div>
      <div class="history-conv-actions">
        <button type="button" class="btn-open-conv">Open</button>
        <button type="button" class="btn-del-conv">Delete</button>
      </div>
    `;
    row.querySelector('.btn-open-conv').addEventListener('click', async () => {
      const res = await fetch(`${API_BASE}/api/conversations/${conv.id}`, { method: 'GET', credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        state.activeConversationId = d.conversation.id;
        state.activeConversationTitle = d.conversation.title;
        renderConversationMessages(d.conversation.messages || []);
        switchTab('home');
      }
    });
    row.querySelector('.btn-del-conv').addEventListener('click', async () => {
      if (!confirm(`Delete "${conv.title}"?`)) return;
      await fetch(`${API_BASE}/api/conversations/${conv.id}`, { method: 'DELETE', credentials: 'include' });
      loadConversations();
    });
    container.appendChild(row);
  });
}

function renderConversationMessages(messages) {
  if (!chatStream) return;
  chatStream.innerHTML = '';
  if (activeConvHeaderPill && activeConvTitleDisplay) {
    activeConvTitleDisplay.textContent = state.activeConversationTitle || 'Active Chat';
    activeConvHeaderPill.classList.remove('hidden');
  }
  messages.forEach(msg => {
    if (msg.role === 'user') appendUserMessageCard(msg.content);
    else appendAssistantMessageCard(msg.content, msg.meta || {});
  });
  chatStream.scrollTop = chatStream.scrollHeight;
}

async function loadBackendMetrics() {
  try {
    const res = await fetch(`${API_BASE}/metrics`, { method: 'GET', credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      const reqEl = document.getElementById('impTotalRequests');
      const tokenEl = document.getElementById('impTotalTokens');
      const costEl = document.getElementById('impTotalCost');
      const savedEl = document.getElementById('impCostSaved');
      const effEl = document.getElementById('impEfficiency');
      if (reqEl) reqEl.textContent = d.total_requests || 1284;
      if (tokenEl) tokenEl.textContent = d.total_tokens ? `${(d.total_tokens / 1000000).toFixed(1)}M` : '2.4M';
      if (costEl) costEl.textContent = `$${(d.total_cost || 12.42).toFixed(2)}`;
      if (savedEl) savedEl.textContent = `$${(d.total_savings || 31.87).toFixed(2)}`;
      if (effEl) effEl.textContent = `${d.cost_savings_percentage || 94.6}%`;
    }
  } catch (e) {}
}


// ============================================================
// 10. NEON CHARTS RENDERING (HTML5 CANVAS)
// ============================================================

function renderAllCharts() {
  renderLineChart('impactCostCanvas');
  renderBarChart('impactSavingsCanvas');
  renderDonutChart('impactTierCanvas');
}

function renderLineChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
  grad.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

  const points = [h - 40, h - 80, h - 60, h - 130, h - 110, h - 170, h - 150];
  const step = (w - 60) / (points.length - 1);

  ctx.beginPath();
  ctx.moveTo(30, points[0]);
  points.forEach((p, i) => ctx.lineTo(30 + i * step, p));
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineTo(30 + (points.length - 1) * step, h - 20);
  ctx.lineTo(30, h - 20);
  ctx.fillStyle = grad;
  ctx.fill();
}

function renderBarChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Before Bar (Red)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(80, 40, 70, h - 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Plus Jakarta Sans';
  ctx.fillText('$44.29', 95, 30);
  ctx.fillText('Before', 95, h - 20);

  // After Bar (Green)
  ctx.fillStyle = '#10b981';
  ctx.fillRect(220, 110, 70, h - 150);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('$12.42', 235, 100);
  ctx.fillText('After', 240, h - 20);
}

function renderDonutChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2, r = 60;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Segment 1 (Cheap/Fast - Green)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 1.1);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Segment 2 (Normal - Cyan)
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.1, Math.PI * 1.7);
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Segment 3 (Powerful - Orange)
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.7, Math.PI * 2);
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 18;
  ctx.stroke();
}


// ============================================================
// 11. THREE.JS 3D VISUALIZERS
// ============================================================

const visualizers3D = {};

function init3DOrb(canvasId, primaryColor = 0xf97316, secondaryColor = 0x9333ea) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return;

  const w = canvas.width || 180;
  const h = canvas.height || 180;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.z = 15;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(w, h);

  const sphereGeo = new THREE.SphereGeometry(3, 24, 24);
  const sphereMat = new THREE.MeshBasicMaterial({ color: primaryColor, wireframe: true, transparent: true, opacity: 0.45 });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  const ringGeo = new THREE.TorusGeometry(5, 0.06, 16, 80);
  const ringMat = new THREE.MeshBasicMaterial({ color: secondaryColor, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 3;
  scene.add(ring);

  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.008;
    sphere.rotation.x += 0.004;
    ring.rotation.z += 0.01;
    renderer.render(scene, camera);
  }
  animate();
}

function initAll3DCanvases() {
  init3DOrb('auth3dCanvas', 0xf97316, 0x9333ea);
  init3DOrb('explore3dCanvas', 0x06b6d4, 0x9333ea);
  init3DOrb('analytics3dCanvas', 0xf97316, 0x10b981);
  init3DOrb('before3dCanvas', 0xef4444, 0xf97316);
  init3DOrb('after3dCanvas', 0x10b981, 0x06b6d4);
  init3DOrb('personal3dCanvas', 0x9333ea, 0xf97316);
  init3DOrb('college3dCanvas', 0x06b6d4, 0x3b82f6);
  init3DOrb('research3dCanvas', 0x3b82f6, 0xec4899);
  init3DOrb('hackathon3dCanvas', 0xf97316, 0xef4444);
}

function triggerView3D(tabId) {
  // Canvases run continuously once initialized
}


// ============================================================
// 12. MODALS & EVENT HANDLERS
// ============================================================

function openTelemetryModal(meta) {
  if (!modalTelemetry) return;
  const reasonEl = document.getElementById('telemetryReasonText');
  const costEl = document.getElementById('telemRoutedCost');
  const baseEl = document.getElementById('telemBaseCost');
  const savedEl = document.getElementById('telemSavedAmount');
  const latencyEl = document.getElementById('telemLatency');
  const qualityEl = document.getElementById('telemQuality');
  const modelEl = document.getElementById('telemModelName');
  const cacheEl = document.getElementById('telemCacheStatus');

  if (reasonEl) reasonEl.textContent = meta.reason || 'Smart Router classified prompt difficulty and allocated optimal compute.';
  if (costEl) costEl.textContent = `$${(meta.cost || meta.estimated_cost || 0.0012).toFixed(4)}`;
  if (baseEl) baseEl.textContent = `$${(meta.baseline_cost || 0.0240).toFixed(4)}`;
  if (savedEl) savedEl.textContent = `$${(meta.savings || meta.estimated_savings || 0.0228).toFixed(4)}`;
  if (latencyEl) latencyEl.textContent = `${meta.latency_ms || 180} ms`;
  if (qualityEl) qualityEl.textContent = `${meta.quality_score || 96.5}%`;
  if (modelEl) modelEl.textContent = meta.selected_model || meta.model || 'Haiku / Small (FAST)';
  if (cacheEl) cacheEl.textContent = meta.cache_hit ? 'HIT (Instant)' : 'MISS (Routed)';

  modalTelemetry.classList.remove('hidden');
}

// Create Workspace Modal
const createWorkspaceBtn = document.getElementById('createWorkspaceBtn');
if (createWorkspaceBtn && modalWorkspace) {
  createWorkspaceBtn.addEventListener('click', () => modalWorkspace.classList.remove('hidden'));
}

const formCreateWs = document.getElementById('formCreateWs');
if (formCreateWs) {
  formCreateWs.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('newWsName');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name })
      });
      if (res.ok) {
        if (modalWorkspace) modalWorkspace.classList.add('hidden');
        nameInput.value = '';
        await loadWorkspaces();
        switchWorkspace(name);
      }
    } catch (err) {}
  });
}

// Create Prompt Modal
const btnOpenCreatePrompt = document.getElementById('btnOpenCreatePrompt');
if (btnOpenCreatePrompt && modalPrompt) {
  btnOpenCreatePrompt.addEventListener('click', () => modalPrompt.classList.remove('hidden'));
}

const formCreatePrompt = document.getElementById('formCreatePrompt');
if (formCreatePrompt) {
  formCreatePrompt.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = document.getElementById('newPromptTitle').value.trim();
    const c = document.getElementById('newPromptCategory').value;
    const body = document.getElementById('newPromptContent').value.trim();
    if (!t || !body) return;

    state.prompts.unshift({ id: `p_${Date.now()}`, title: t, category: c, target_tier: 'AUTO', content: body });
    if (modalPrompt) modalPrompt.classList.add('hidden');
    formCreatePrompt.reset();
    renderPromptLibrary();
  });
}

// Settings Navigation
document.querySelectorAll('.settings-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const sec = btn.dataset.sec;
    document.querySelectorAll('.settings-section-card').forEach(c => c.classList.add('hidden'));
    const target = document.getElementById(`sec${sec.charAt(0).toUpperCase() + sec.slice(1)}`);
    if (target) target.classList.remove('hidden');
  });
});

// Profile / Settings Modals
const btnSidebarSettings = document.getElementById('btnSidebarSettings');
const topProfileBtn = document.getElementById('topProfileBtn');
const userProfileBtn = document.getElementById('userProfileBtn');

if (btnSidebarSettings && modalProfile) btnSidebarSettings.addEventListener('click', (e) => { e.stopPropagation(); modalProfile.classList.remove('hidden'); });
if (topProfileBtn && modalProfile) topProfileBtn.addEventListener('click', () => modalProfile.classList.remove('hidden'));
if (userProfileBtn && modalProfile) userProfileBtn.addEventListener('click', () => modalProfile.classList.remove('hidden'));

// Close modals
document.querySelectorAll('.modal-close-btn, .modal-backdrop, [data-close="modal"]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const m = e.target.closest('.modal-overlay-wrap') || btn.closest('.modal-overlay-wrap');
    if (m) m.classList.add('hidden');
  });
});

// Logout handlers
document.querySelectorAll('#btnLogout, #btnLogoutSettings').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutNexora();
  });
});


// ============================================================
// 13. UTILITIES & STARTUP
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatMarkdownResponse(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`);
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const paragraphs = formatted.split(/\n\n+/);
  return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

async function startNexoraMaster() {
  console.log('========================================');
  console.log('[NEXORA] Starting Master Platform...');
  console.log('========================================');

  init3DOrb('auth3dCanvas', 0xf97316, 0x9333ea);
  initGoogleGsiConfig();

  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth') === 'success';
  const authError = urlParams.get('auth_error');

  if (authSuccess || authError) {
    window.history.replaceState({}, document.title, window.location.pathname);
    if (authError) {
      alert(`Google sign-in error: ${authError}`);
      showAuthScreen();
      return;
    }
    if (authSuccess) {
      showLoadingScreen();
      let confirmed = false;
      for (let i = 1; i <= 4; i++) {
        confirmed = await checkSessionAuth();
        if (confirmed) break;
        await new Promise(r => setTimeout(r, 600));
      }
      if (confirmed) {
        await runAuthLoadingSequence();
        return;
      }
      state.authenticated = true;
      transitionToDashboard();
      return;
    }
  }

  const existingSession = await checkSessionAuth();
  if (existingSession) {
    await Promise.allSettled([loadWorkspaces(), loadConversations(), loadRAGDocuments(), loadBackendMetrics()]);
    transitionToDashboard();
  } else {
    showAuthScreen();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startNexoraMaster, { once: true });
} else {
  startNexoraMaster();
}