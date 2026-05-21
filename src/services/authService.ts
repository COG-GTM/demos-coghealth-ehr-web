import { api } from './api';

const TOKEN_KEY = 'auth_token';

export interface AuthResponse {
  token: string;
  type: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  register: async (data: SignUpRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  me: (): Promise<UserInfo> => {
    return api.get<UserInfo>('/auth/me');
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh');
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/change-password', data);
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem(TOKEN_KEY) !== null;
  },
};
