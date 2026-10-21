import { ConfigService } from '@nestjs/config';
import { OrkesService } from './orkes.service';
import {
  OrkesNotConfiguredException,
  OrkesRequestFailedException,
  OrkesUnexpectedResponseException,
} from './exceptions/orkes.exceptions';

describe('OrkesService', () => {
  const HOST = 'https://orkes.test/api';

  let service: OrkesService;
  let mockFetch: jest.SpyInstance;
  let config: Record<string, string | number | undefined>;

  const tokenResponse = (token = 'token-1') => new Response(JSON.stringify({ token }));

  beforeEach(() => {
    config = {
      CONDUCTOR_SERVER_URL: `${HOST}/`,
      CONDUCTOR_AUTH_KEY: 'key-id',
      CONDUCTOR_AUTH_SECRET: 'key-secret',
      CONDUCTOR_WORKFLOW_NAME: 'video_workflow',
      CONDUCTOR_WORKFLOW_VERSION: 2,
    };
    const mockConfigService = { get: jest.fn((key: string) => config[key]) };
    service = new OrkesService(mockConfigService as unknown as ConfigService);
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('startWorkflow', () => {
    it('returns the workflow id from the plain-text response', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response('wf-123\n'));

      const actualId = await service.startWorkflow({ videoUrl: 'https://example.com/v.mp4' });

      expect(actualId).toBe('wf-123');
      expect(mockFetch).toHaveBeenLastCalledWith(
        `${HOST}/workflow/video_workflow?version=2`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ videoUrl: 'https://example.com/v.mp4' }),
          headers: expect.objectContaining({ 'X-Authorization': 'token-1' }),
        }),
      );
    });

    it('omits the version so Orkes runs the latest when none is configured', async () => {
      config.CONDUCTOR_WORKFLOW_VERSION = undefined;
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response('wf-123'));

      await service.startWorkflow({});

      expect(mockFetch).toHaveBeenLastCalledWith(
        `${HOST}/workflow/video_workflow`,
        expect.anything(),
      );
    });

    it('reuses the cached token across calls', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response('wf-1'))
        .mockResolvedValueOnce(new Response('wf-2'));

      await service.startWorkflow({});
      await service.startWorkflow({});

      const tokenCalls = mockFetch.mock.calls.filter(([url]) => url === `${HOST}/token`);
      expect(tokenCalls).toHaveLength(1);
    });

    it('refreshes the token and retries once when Orkes returns 401', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse('expired'))
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockResolvedValueOnce(tokenResponse('fresh'))
        .mockResolvedValueOnce(new Response('wf-123'));

      const actualId = await service.startWorkflow({});

      expect(actualId).toBe('wf-123');
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Authorization': 'fresh' }),
        }),
      );
    });

    it('throws OrkesRequestFailedException when Orkes rejects the start', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response('forbidden', { status: 403 }));

      await expect(service.startWorkflow({})).rejects.toBeInstanceOf(OrkesRequestFailedException);
    });

    it('throws OrkesNotConfiguredException naming the missing variables', async () => {
      config.CONDUCTOR_AUTH_SECRET = undefined;
      config.CONDUCTOR_WORKFLOW_NAME = '';

      await expect(service.startWorkflow({})).rejects.toThrow(
        new OrkesNotConfiguredException(['CONDUCTOR_AUTH_SECRET', 'CONDUCTOR_WORKFLOW_NAME']),
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('appends /api when the server URL is the UI address', async () => {
      config.CONDUCTOR_SERVER_URL = 'https://orkes.test';
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response('wf-123'));

      await service.startWorkflow({});

      expect(mockFetch).toHaveBeenNthCalledWith(1, `${HOST}/token`, expect.anything());
      expect(mockFetch).toHaveBeenLastCalledWith(
        `${HOST}/workflow/video_workflow?version=2`,
        expect.anything(),
      );
    });

    it('throws OrkesUnexpectedResponseException when the token request returns a web page', async () => {
      mockFetch.mockResolvedValueOnce(new Response('<!doctype html><html></html>'));

      await expect(service.startWorkflow({})).rejects.toBeInstanceOf(
        OrkesUnexpectedResponseException,
      );
    });

    it('throws OrkesUnexpectedResponseException instead of storing a web page as the id', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response('<!doctype html><html></html>'));

      await expect(service.startWorkflow({})).rejects.toBeInstanceOf(
        OrkesUnexpectedResponseException,
      );
    });
  });

  describe('getWorkflow', () => {
    it('maps the execution to a snapshot without fetching tasks', async () => {
      const inputBody = {
        status: 'COMPLETED',
        output: { result: 'ok' },
        reasonForIncompletion: undefined,
        tasks: [],
      };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify(inputBody)));

      const actualSnapshot = await service.getWorkflow('wf-123');

      expect(actualSnapshot).toEqual({
        workflowId: 'wf-123',
        status: 'COMPLETED',
        output: { result: 'ok' },
        reasonForIncompletion: null,
      });
      expect(mockFetch).toHaveBeenLastCalledWith(
        `${HOST}/workflow/wf-123?includeTasks=false`,
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });
});
