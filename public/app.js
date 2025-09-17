
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const signinBtn = document.getElementById('signinBtn');
const signupBtn = document.getElementById('signupBtn');
const signoutBtn = document.getElementById('signoutBtn');
const chatSection = document.getElementById('chatSection');
const authNotice = document.getElementById('authNotice');
const authModal = document.getElementById('authModal');
const authBox = document.getElementById('authBox');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const backBtn = document.getElementById('backBtn');
let authMode = 'signin';

function getSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sessionId', id);
  }
  return id;
}

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function updateAuthUI() {
  if (isAuthenticated()) {
    signinBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    signoutBtn.style.display = '';
    chatSection.style.display = '';
    authNotice.style.display = 'none';
  } else {
    signinBtn.style.display = '';
    signupBtn.style.display = '';
    signoutBtn.style.display = 'none';
    chatSection.style.display = 'none';
    authNotice.style.display = '';
    messagesEl.innerHTML = '';
  }
}

async function sendMessage() {
  if (!isAuthenticated()) {
    addMessage('assistant', 'Please sign in to use the chat.');
    return;
  }
  const text = inputEl.value.trim();
  if (!text) return;
  sendBtn.disabled = true;
  inputEl.value = '';
  addMessage('user', text);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({ sessionId: getSessionId(), message: text })
    });
    const data = await res.json();
    if (res.ok) {
      addMessage('assistant', data.reply);
    } else {
      addMessage('assistant', 'Error: ' + (data.error || 'Something went wrong'));
    }
  } catch (e) {
    addMessage('assistant', 'Network error');
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener('click', sendMessage);

signinBtn.onclick = () => showAuthModal('signin');
signupBtn.onclick = () => showAuthModal('signup');
signoutBtn.onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  updateAuthUI();
};

function showAuthModal(mode) {
  authMode = mode;
  authModal.style.display = '';
  authTitle.textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  authSubmit.textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  document.getElementById('authName').style.display = mode === 'signup' ? '' : 'none';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  if (mode === 'signup') document.getElementById('authName').value = '';
}

backBtn.onclick = () => {
  authModal.style.display = 'none';
};

authSubmit.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const name = authMode === 'signup' ? document.getElementById('authName').value.trim() : '';
  if (!email || !password || (authMode === 'signup' && !name)) return alert('Please fill all fields');
  try {
    const body = authMode === 'signup' ? { name, email, password } : { email, password };
    const res = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      updateAuthUIExtended();
      authModal.style.display = 'none';
    } else {
      alert(data.error || 'Error');
    }
  } catch (err) {
    alert('Network error');
  }
};

updateAuthUI();

// Additional JS from embedded script in HTML

const fileInput = document.getElementById('fileInput');
const newSessionBtn = document.getElementById('newSession');
const recentChatsEl = document.getElementById('recentChats');
const centerSignupBtn = document.getElementById('centerSignupBtn');
const centerSigninBtn = document.getElementById('centerSigninBtn');

if (centerSignupBtn) {
  centerSignupBtn.onclick = () => showAuthModal('signup');
}
if (centerSigninBtn) {
  centerSigninBtn.onclick = () => showAuthModal('signin');
}
const mobileSignoutBtn = document.getElementById('mobileSignout');

function newSession() {
  localStorage.setItem('sessionId', crypto.randomUUID());
  messagesEl.innerHTML = '';
}

function loadChatHistory(sessionId) {
  fetch(`/api/history/${sessionId}`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data.messages)) {
        messagesEl.innerHTML = '';
        data.messages.forEach(msg => {
          addMessage(msg.role, msg.content);
        });
      }
    })
    .catch(() => {
      messagesEl.innerHTML = '';
    });
}

function fetchRecentChats() {
  recentChatsEl.innerHTML = '';
  if (!isAuthenticated()) return;
  fetch('/api/recent', {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data.sessions)) {
        data.sessions.forEach((sessionId, index) => {
          const li = document.createElement('li');
          const chatNumber = data.sessions.length - index;
          li.textContent = `Chat ${chatNumber}`;
          li.title = `Session: ${sessionId}`;
          li.style.cursor = 'pointer';
          li.style.background = '#111827';
          li.style.padding = '8px 10px';
          li.style.borderRadius = '8px';
          li.style.fontSize = '14px';
          li.style.marginBottom = '4px';
          li.style.transition = 'background 0.2s';
          li.onmouseover = () => li.style.background = '#1f2937';
          li.onmouseout = () => li.style.background = '#111827';
          li.onclick = () => {
            localStorage.setItem('sessionId', sessionId);
            loadChatHistory(sessionId);
          };
          recentChatsEl.appendChild(li);
        });
      }
    })
    .catch(() => { });
}

function updateAuthUIExtended() {
  const sidebar = document.getElementById('sidebar');
  const container = document.querySelector('.container');
  if (isAuthenticated()) {
    signupBtn.style.display = 'none';
    signinBtn.style.display = 'none';
    signoutBtn.style.display = '';
    chatSection.style.display = '';
    authNotice.style.display = 'none';
    if (sidebar) sidebar.style.display = '';
    if (container) {
      container.style.alignItems = '';
      container.style.justifyContent = '';
    }
    sendBtn.disabled = false;
    inputEl.disabled = false;
    fetchRecentChats();
  } else {
    signupBtn.style.display = '';
    signinBtn.style.display = '';
    signoutBtn.style.display = 'none';
    chatSection.style.display = 'none';
    authNotice.style.display = '';
    if (sidebar) sidebar.style.display = 'none';
    if (container) {
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
    }
    sendBtn.disabled = true;
    inputEl.disabled = true;
    recentChatsEl.innerHTML = '';
  }
}


async function verifyTokenOnLoad() {
  const token = localStorage.getItem('token');
  if (!token) { updateAuthUIExtended(); return; }
  try {
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        localStorage.setItem('userName', data.user.name || 'User');
      }
    }
  } catch (_) {}
  updateAuthUIExtended();
}


centerSignupBtn.onclick = () => showAuthModal('signup');
centerSigninBtn.onclick = () => showAuthModal('signin');
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  updateAuthUIExtended();
  messagesEl.innerHTML = '';
}
signoutBtn.onclick = logout;
if (mobileSignoutBtn) mobileSignoutBtn.onclick = logout;

// Fix modal logic: ensure correct fields are shown
function showAuthModal(mode) {
  authMode = mode;
  authModal.style.display = '';
  authTitle.textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  authSubmit.textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  document.getElementById('authName').style.display = mode === 'signup' ? '' : 'none';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  if (mode === 'signup') document.getElementById('authName').value = '';
}

backBtn.onclick = () => {
  authModal.style.display = 'none';
};

authSubmit.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const name = authMode === 'signup' ? document.getElementById('authName').value.trim() : '';
  if (!email || !password || (authMode === 'signup' && !name)) return alert('Please fill all fields');
  try {
    const body = authMode === 'signup' ? { name, email, password } : { email, password };
    const res = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      updateAuthUIExtended();
      authModal.style.display = 'none';
    } else {
      alert(data.error || 'Error');
    }
  } catch (err) {
    alert('Network error');
  }
};

function autosize() {
  inputEl.style.height = 'auto';
  const next = Math.min(200, inputEl.scrollHeight);
  inputEl.style.height = next + 'px';
}
inputEl.addEventListener('input', autosize);
setTimeout(autosize, 0);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener('click', sendMessage);

if (fileInput) {
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) {
      const note = `\n[Attached file: ${f.name} (${Math.round(f.size/1024)} KB)]`;
      inputEl.value = (inputEl.value || '') + note;
      autosize();
      inputEl.focus();
    }
  });
}
newSessionBtn.addEventListener('click', newSession);

verifyTokenOnLoad();
