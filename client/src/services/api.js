import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('surveylite_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email, password) => {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.put('/auth/password', { currentPassword, newPassword });
    return res.data;
  },
  deleteAccount: async (password) => {
    const res = await api.delete('/auth/account', { data: { password } });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  verifyResetToken: async (token) => {
    const res = await api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    return res.data;
  },
  resetPassword: async (token, newPassword) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },
};

export const surveyApi = {
  list: async () => {
    const res = await api.get('/surveys');
    return res.data.surveys;
  },
  get: async (id) => {
    const res = await api.get(`/surveys/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/surveys', data);
    return res.data.survey;
  },
  update: async (id, data) => {
    const res = await api.put(`/surveys/${id}`, data);
    return res.data.survey;
  },
  toggleActive: async (id, isActive) => {
    const res = await api.patch(`/surveys/${id}/toggle-active`, { is_active: isActive });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/surveys/${id}`);
    return res.data;
  },
  duplicate: async (id) => {
    const res = await api.post(`/surveys/${id}/duplicate`);
    return res.data;
  },
  getAnalytics: async (id) => {
    const res = await api.get(`/surveys/${id}/analytics`);
    return res.data;
  },
  getResponses: async (id) => {
    const res = await api.get(`/surveys/${id}/responses`);
    return res.data;
  },
  updateResponse: async (id, responseId, answers) => {
    const res = await api.put(`/surveys/${id}/responses/${responseId}`, { answers });
    return res.data;
  },
  deleteResponse: async (id, responseId) => {
    const res = await api.delete(`/surveys/${id}/responses/${responseId}`);
    return res.data;
  },
  getCsvExportUrl: (id) => `/api/surveys/${id}/export/csv`,
  getXlsxExportUrl: (id) => `/api/surveys/${id}/export/xlsx`,
};

export const publicApi = {
  getSurvey: async (id) => {
    const res = await api.get(`/public/surveys/${id}`);
    return res.data;
  },
  submit: async (id, answers) => {
    const res = await api.post(`/public/surveys/${id}/submit`, { answers });
    return res.data;
  },
};

export const adminApi = {
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getUsers: async (search = '') => {
    const res = await api.get('/admin/users', { params: { search } });
    return res.data;
  },
  getUser: async (id) => {
    const res = await api.get(`/admin/users/${id}`);
    return res.data;
  },
  updateUser: async (id, data) => {
    const res = await api.put(`/admin/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
  getSurveys: async (search = '', status = 'all') => {
    const res = await api.get('/admin/surveys', { params: { search, status } });
    return res.data;
  },
  updateSurvey: async (id, data) => {
    const res = await api.put(`/admin/surveys/${id}`, data);
    return res.data;
  },
  deleteSurvey: async (id) => {
    const res = await api.delete(`/admin/surveys/${id}`);
    return res.data;
  },
};

export const pollApi = {
  list: async () => {
    const res = await api.get('/polls');
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/polls/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/polls', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/polls/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/polls/${id}`);
    return res.data;
  },
  duplicate: async (id) => {
    const res = await api.post(`/polls/${id}/duplicate`);
    return res.data;
  },
  setStatus: async (id, status) => {
    const res = await api.post(`/polls/${id}/status`, { status });
    return res.data;
  },
  setQuestion: async (id, question_id) => {
    const res = await api.post(`/polls/${id}/question`, { question_id });
    return res.data;
  },
  toggleVoting: async (id) => {
    const res = await api.post(`/polls/${id}/toggle-voting`);
    return res.data;
  },
  toggleResults: async (id) => {
    const res = await api.post(`/polls/${id}/toggle-results`);
    return res.data;
  },
  getAnalytics: async (id) => {
    const res = await api.get(`/polls/${id}/analytics`);
    return res.data;
  },
  getCsvExportUrl: (id) => `/api/polls/${id}/export`,
};

export const publicPollApi = {
  lookupByCode: async (code, participantId) => {
    const res = await api.get(`/public/polls/code/${encodeURIComponent(code)}`, {
      params: { participantId }
    });
    return res.data;
  },
  get: async (id, participantId) => {
    const res = await api.get(`/public/polls/${id}`, {
      params: { participantId }
    });
    return res.data;
  },
  vote: async (id, data) => {
    const res = await api.post(`/public/polls/${id}/vote`, data);
    return res.data;
  },
  submitQA: async (id, data) => {
    const res = await api.post(`/public/polls/${id}/qa`, data);
    return res.data;
  },
  upvoteQA: async (id, questionId, participantId) => {
    const res = await api.post(`/public/polls/${id}/qa/${questionId}/upvote`, { participantId });
    return res.data;
  },
};

export default api;

