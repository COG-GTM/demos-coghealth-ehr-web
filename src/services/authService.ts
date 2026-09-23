import { api } from './api';
import { clearAuthToken, isAuthenticated, setAuthToken } from './authToken';

interface LoginResponse {
  token: string;
  type: string;
}

export const authService = {
  login: async (username: string, password: string): Promise<void> => {
    const { token } = await api.postAnonymous<LoginResponse>('/auth/login', { username, password });
    setAuthToken(token);
  },

  logout: (): void => {
    clearAuthToken();
  },

  isAuthenticated,
};
