import { ApiClient } from '../api-client';

// Mock fetch and Headers
global.fetch = jest.fn();
global.Headers = jest.fn().mockImplementation(() => {
  const headers = new Map();
  return {
    get: jest.fn((name) => headers.get(name.toLowerCase())),
    set: jest.fn((name, value) => headers.set(name.toLowerCase(), value)),
    has: jest.fn((name) => headers.has(name.toLowerCase())),
  };
});

// Mock authStorage
jest.mock('../auth-storage', () => ({
  authStorage: {
    getAccessToken: jest.fn(() => null),
    getRefreshToken: jest.fn(() => null),
    isAuthenticated: jest.fn(() => false),
    setTokens: jest.fn(),
    setUser: jest.fn(),
  },
}));

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3001');
    (fetch as jest.Mock).mockClear();
  });

  describe('post', () => {
    it('makes a POST request with correct headers and body', async () => {
      const mockResponse = { data: 'success' };
      const headers = new (global.Headers as any)();
      headers.set('content-type', 'application/json');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers,
        json: async () => mockResponse,
      });

      const result = await apiClient.post('/test', { key: 'value' });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ key: 'value' }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws ApiError on non-ok response', async () => {
      const headers = new (global.Headers as any)();
      headers.set('content-type', 'application/json');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers,
        json: async () => ({ message: 'Bad Request' }),
      });

      await expect(apiClient.post('/test', {})).rejects.toMatchObject({
        message: 'Bad Request',
        statusCode: 400,
      });
    });

    it('handles network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.post('/test', {})).rejects.toMatchObject({
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      });
    });
  });

  describe('get', () => {
    it('makes a GET request', async () => {
      const mockResponse = { data: 'success' };
      const headers = new (global.Headers as any)();
      headers.set('content-type', 'application/json');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers,
        json: async () => mockResponse,
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
