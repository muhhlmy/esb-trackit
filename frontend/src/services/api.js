// Base API Client for ESB Case Playbook Fullstack
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken() {
  return localStorage.getItem('esb_auth_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('esb_auth_token', token);
  } else {
    localStorage.removeItem('esb_auth_token');
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // FAQ Articles (Knowledge Base & Homepage Featured)
  async getCases(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.severity && params.severity !== 'all') query.append('severity', params.severity);
    if (params.featured) query.append('featured', 'true');
    if (params.all) query.append('all', 'true');

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/cases${queryString}`);
  },

  async getPopularCases(limit = 5) {
    return request(`/cases/popular?limit=${limit}`);
  },

  async getCaseById(id) {
    return request(`/cases/${id}`);
  },

  async createCase(caseData) {
    return request('/cases', {
      method: 'POST',
      body: JSON.stringify(caseData)
    });
  },

  async updateCase(id, caseData) {
    return request(`/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(caseData)
    });
  },

  async reorderHomeCases(orders) {
    return request('/cases/home-reorder', {
      method: 'PUT',
      body: JSON.stringify({ orders })
    });
  },

  async deleteCase(id) {
    return request(`/cases/${id}`, {
      method: 'DELETE'
    });
  },

  async recordCaseInteraction(caseId, type, sessionId) {
    return request(`/cases/${caseId}/interaction`, {
      method: 'POST',
      body: JSON.stringify({ type, sessionId })
    });
  },

  // Stats
  async getStats() {
    return request('/stats');
  },

  // Auth
  async login(username, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  async getMe() {
    return request('/auth/me');
  }
};
