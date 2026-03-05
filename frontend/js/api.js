// ═══════════════════════════════════════════════════════════════
//  api.js — Frontend API client
//  Replaces store.js. Every call hits the Node.js/MySQL backend.
// ═══════════════════════════════════════════════════════════════

const API_BASE = '/api';

// ─── Core fetch wrapper ───────────────────────────────────────
// Sends JSON requests, handles errors uniformly.
async function apiFetch(url, options = {}) {
  const defaultOpts = {
    credentials: 'include',          // send/receive cookies (session)
    headers: { 'Content-Type': 'application/json' },
  };

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (options.body instanceof FormData) {
    delete defaultOpts.headers['Content-Type'];
  }

  const res = await fetch(API_BASE + url, { ...defaultOpts, ...options });

  // Try to parse JSON regardless of status code (errors come as JSON too)
  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
//  Auth API
// ═══════════════════════════════════════════════════════════════
const Auth = {
  // Returns current session from server (used on page load to check login state)
  async me() {
    try { return await apiFetch('/auth/me'); }
    catch { return null; }
  },

  async loginStudent(enNumber) {
    return apiFetch('/auth/student/login', {
      method: 'POST',
      body:   JSON.stringify({ enNumber }),
    });
  },

  async loginAdmin(username, password) {
    return apiFetch('/auth/admin/login', {
      method: 'POST',
      body:   JSON.stringify({ username, password }),
    });
  },

  async logout() {
    return apiFetch('/auth/logout', { method: 'POST' });
  },
};

// ═══════════════════════════════════════════════════════════════
//  Complaint API
// ═══════════════════════════════════════════════════════════════
const ComplaintAPI = {
  // Student: get own complaints
  async getMy() {
    return apiFetch('/complaints/my');
  },

  // Student: get own stats
  async getMyStats() {
    return apiFetch('/complaints/my/stats');
  },

  // Student: submit new complaint (with optional image file)
  async submit({ category, description, imageFile }) {
    const form = new FormData();
    form.append('category',    category);
    form.append('description', description);
    if (imageFile) form.append('image', imageFile);

    return apiFetch('/complaints', {
      method: 'POST',
      body:   form,
    });
  },

  // Admin: get all complaints with optional filters
  async getAll({ search = '', status = '', category = '', page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (search)   params.set('search',   search);
    if (status)   params.set('status',   status);
    if (category) params.set('category', category);
    params.set('page', page);
    params.set('size', size);
    return apiFetch(`/complaints?${params.toString()}`);
  },

  // Admin: get overall stats
  async getStats() {
    return apiFetch('/complaints/stats');
  },

  // Admin: update complaint status
  async updateStatus(id, status) {
    return apiFetch(`/complaints/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
    });
  },

  // Admin: delete a complaint
  async delete(id) {
    return apiFetch(`/complaints/${id}`, { method: 'DELETE' });
  },
};

// ═══════════════════════════════════════════════════════════════
//  UI Helpers (shared across all pages)
// ═══════════════════════════════════════════════════════════════

function statusBadge(status) {
  const cfg = {
    'Pending':     ['badge-pending',  '⏳ Pending'],
    'In_Progress': ['badge-progress', '🔄 In Progress'],
    'Resolved':    ['badge-resolved', '✅ Resolved'],
  };
  const [cls, label] = cfg[status] || ['badge-pending', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function categoryIcon(cat) {
  const icons = { Electricity:'⚡', Water:'💧', Cleanliness:'🧹', WiFi:'📶', Classroom:'🏫', Hostel:'🏠', Other:'📌' };
  return icons[cat] || '📌';
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showToast(message, type = 'info') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Initialise navbar: show user badge and wire up logout button
function initNavbar(logoutHref) {
  const badge  = document.getElementById('user-badge');
  const logBtn = document.getElementById('logout-btn');

  // Get current user info from session storage (set during login redirect)
  const userStr = sessionStorage.getItem('cp_user');
  const user    = userStr ? JSON.parse(userStr) : null;

  if (badge && user) badge.textContent = user.enNumber || user.username || 'User';

  if (logBtn) {
    logBtn.addEventListener('click', async () => {
      try { await Auth.logout(); } catch (e) { /* ignore */ }
      sessionStorage.removeItem('cp_user');
      window.location.href = logoutHref;
    });
  }
}
