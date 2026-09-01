const API_BASE = '/api';

// Token sesi dikelola oleh utils/authStorage.js (key 'token', diisi saat login).
import { getAuthToken as readStoredToken, clearAuthSession } from '../utils/authStorage.js';

export function getAuthToken() {
  return readStoredToken() || '';
}

export function setAuthToken(token) {
  if (!token) {
    clearAuthSession();
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`[API Error: ${endpoint}]`, err.message);
    throw err;
  }
}

export const api = {
  // Cases — public Help Center (published only)
  async getPublicCases() {
    return request('/cases/public');
  },

  // Cases — admin CMS (all)
  async getCases(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.severity && params.severity !== 'all') query.append('severity', params.severity);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/cases${queryString}`);
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

  async deleteCase(id) {
    return request(`/cases/${id}`, {
      method: 'DELETE'
    });
  },

  // Templates
  async getTemplates() {
    return request('/templates');
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
  },

  logout() {
    setAuthToken(null);
  }
};
