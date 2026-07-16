import axios from 'axios';

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('invoico_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? '';
    const isAuthAttempt =
      url.includes('/auth/login') || url.includes('/auth/register');

    if ((status === 401 || status === 410) && !isAuthAttempt) {
      localStorage.removeItem('invoico_token');
      localStorage.removeItem('invoico_user');
      onUnauthorized?.();
    }

    const message =
      error?.response?.data?.message || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export default api;
