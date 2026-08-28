import { AuthApi } from '../auth-api';
import { apiClient } from '../api-client';

jest.mock('../api-client');

describe('AuthApi', () => {
  let authApi: AuthApi;

  beforeEach(() => {
    authApi = new AuthApi();
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('calls API with correct endpoint and data', async () => {
      const mockResponse = { message: 'OTP sent' };
      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authApi.requestOtp({ email: 'test@example.com' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/otp/request', {
        email: 'test@example.com',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('signUpWithOtp', () => {
    it('calls API with correct endpoint and data', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authApi.signUpWithOtp({
        email: 'test@example.com',
        otp: '123456',
        name: 'Test User',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/signup/otp', {
        email: 'test@example.com',
        otp: '123456',
        name: 'Test User',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('signUp', () => {
    it('calls API with correct endpoint and data', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authApi.signUp({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/signup', {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('login', () => {
    it('calls API with correct endpoint and data', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('refreshToken', () => {
    it('calls API with correct endpoint and data', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authApi.refreshToken({
        refreshToken: 'old-refresh',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh', {
        refreshToken: 'old-refresh',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
