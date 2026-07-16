import api from './apiClient';
import type { AuthResponse, User } from '../types';

export const authService = {
  /** Log in existing user */
  async login(payload: Record<string, string>): Promise<AuthResponse['data']> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    if (data.data.token) {
      localStorage.setItem('invoico_token', data.data.token);
      localStorage.setItem('invoico_user', JSON.stringify(data.data));
    }
    return data.data;
  },

  /** Sign up new user */
  async register(payload: Record<string, string>): Promise<AuthResponse['data']> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    if (data.data.token) {
      localStorage.setItem('invoico_token', data.data.token);
      localStorage.setItem('invoico_user', JSON.stringify(data.data));
    }
    return data.data;
  },

  /** Log in with Google */
  async loginWithGoogle(idToken: string): Promise<AuthResponse['data']> {
    const { data } = await api.post<AuthResponse>('/auth/google', { idToken });
    if (data.data.token) {
      localStorage.setItem('invoico_token', data.data.token);
      localStorage.setItem('invoico_user', JSON.stringify(data.data));
    }
    return data.data;
  },

  /** Retrieve profile details of currently logged in user */
  async getMe(): Promise<User> {
    const { data } = await api.get<{ success: boolean; data: User }>('/auth/me');
    return data.data;
  },

  /** Update user profile */
  async updateProfile(payload: Partial<User>): Promise<User> {
    const { data } = await api.put<{ success: boolean; data: User }>('/auth/profile', payload);
    localStorage.setItem('invoico_user', JSON.stringify(data.data));
    return data.data;
  },

  /** Log out current session */
  logout(): void {
    localStorage.removeItem('invoico_token');
    localStorage.removeItem('invoico_user');
  },

  /** Fetch current token directly */
  getToken(): string | null {
    return localStorage.getItem('invoico_token');
  },

  /** Fetch parsed user profile details */
  getUser(): User | null {
    const user = localStorage.getItem('invoico_user');
    if (!user) return null;
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  },
};
