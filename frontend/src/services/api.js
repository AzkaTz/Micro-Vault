import axios from 'axios';

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? ''              // same origin → Vercel
    : 'http://localhost:5000';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },
};

// Strains API
export const strainsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/strains', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/strains/${id}`);
    return response.data;
  },
  
  create: async (strainData) => {
    const response = await api.post('/api/strains', strainData);
    return response.data;
  },
  
  update: async (id, strainData) => {
    const response = await api.put(`/api/strains/${id}`, strainData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/api/strains/${id}`);
    return response.data;
  },
  
  restore: async (id) => {
    const response = await api.patch(`/api/strains/${id}/restore`);
    return response.data;
  },
};

export default api;