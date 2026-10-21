import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrkesNotConfiguredException,
  OrkesRequestFailedException,
  OrkesUnexpectedResponseException,
} from './exceptions/orkes.exceptions';

/** Execution states reported by Conductor for a workflow run. */
export type OrkesWorkflowStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'TERMINATED';

export interface OrkesWorkflowSnapshot {
  readonly workflowId: string;
  readonly status: OrkesWorkflowStatus;
  readonly output: Record<string, unknown> | null;
  readonly reasonForIncompletion: string | null;
}

interface OrkesConfig {
  readonly host: string;
  readonly keyId: string;
  readonly keySecret: string;
  readonly workflowName: string;
  readonly workflowVersion: number | undefined;
}

/**
 * Thin client for the Orkes Conductor REST API.
 *
 * Credentials never leave the server: the browser talks to our API, and only
 * this service talks to Orkes. Config is read per call rather than at boot so
 * the app still starts for anyone without an Orkes account.
 */
@Injectable()
export class OrkesService {
  private readonly logger = new Logger(OrkesService.name);

  /**
   * Shared in-flight token request, so concurrent calls after expiry fetch one
   * token instead of one each.
   */
  private tokenRequest: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {}

  /** Start the configured workflow and return its execution id. */
  async startWorkflow(input: Record<string, unknown>): Promise<string> {
    const config = this.readConfig();
    const query = config.workflowVersion !== undefined ? `?version=${config.workflowVersion}` : '';
    const path = `/workflow/${encodeURIComponent(config.workflowName)}${query}`;

    const response = await this.authorizedFetch(config, path, 'start workflow', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    // Conductor answers with the bare id as text/plain, not JSON.
    const workflowId = (await response.text()).trim();

    if (workflowId.startsWith('<')) {
      throw new OrkesUnexpectedResponseException('start workflow');
    }

    return workflowId;
  }

  async getWorkflow(workflowId: string): Promise<OrkesWorkflowSnapshot> {
    const config = this.readConfig();
    const path = `/workflow/${encodeURIComponent(workflowId)}?includeTasks=false`;

    const response = await this.authorizedFetch(config, path, 'get workflow', { method: 'GET' });
    const body = await this.readJson<Partial<OrkesWorkflowSnapshot>>(response, 'get workflow');

    return {
      workflowId,
      status: body.status ?? 'RUNNING',
      output: body.output ?? null,
      reasonForIncompletion: body.reasonForIncompletion ?? null,
    };
  }

  /**
   * Send a request with the cached token. A 401 means the token expired, so
   * fetch a fresh one and retry exactly once.
   */
  private async authorizedFetch(
    config: OrkesConfig,
    path: string,
    action: string,
    init: RequestInit,
  ): Promise<Response> {
    const send = async (): Promise<Response> =>
      fetch(`${config.host}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': await this.getToken(config),
        },
      });

    let response = await send();

    if (response.status === HttpStatus.UNAUTHORIZED) {
      this.tokenRequest = null;
      response = await send();
    }

    if (!response.ok) {
      this.logger.error(`Orkes ${action} failed: ${response.status} ${await response.text()}`);
      throw new OrkesRequestFailedException(action, response.status);
    }

    return response;
  }

  private getToken(config: OrkesConfig): Promise<string> {
    if (!this.tokenRequest) {
      this.tokenRequest = this.requestToken(config).catch((error: unknown) => {
        this.tokenRequest = null;
        throw error;
      });
    }

    return this.tokenRequest;
  }

  private async requestToken(config: OrkesConfig): Promise<string> {
    const response = await fetch(`${config.host}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId: config.keyId, keySecret: config.keySecret }),
    });

    if (!response.ok) {
      this.logger.error(`Orkes token request failed: ${response.status}`);
      throw new OrkesRequestFailedException('get token', response.status);
    }

    const body = await this.readJson<{ token?: string }>(response, 'get token');

    if (!body.token) {
      throw new OrkesRequestFailedException('get token', response.status);
    }

    return body.token;
  }

  private async readJson<T>(response: Response, action: string): Promise<T> {
    const text = await response.text();

    try {
      return JSON.parse(text) as T;
    } catch {
      this.logger.error(`Orkes ${action} returned non-JSON (status ${response.status})`);
      throw new OrkesUnexpectedResponseException(action);
    }
  }

  private readConfig(): OrkesConfig {
    const host = this.configService.get<string>('CONDUCTOR_SERVER_URL');
    const keyId = this.configService.get<string>('CONDUCTOR_AUTH_KEY');
    const keySecret = this.configService.get<string>('CONDUCTOR_AUTH_SECRET');
    const workflowName = this.configService.get<string>('CONDUCTOR_WORKFLOW_NAME');
    const version = this.configService.get<number | string>('CONDUCTOR_WORKFLOW_VERSION');

    const missing = Object.entries({
      CONDUCTOR_SERVER_URL: host,
      CONDUCTOR_AUTH_KEY: keyId,
      CONDUCTOR_AUTH_SECRET: keySecret,
      CONDUCTOR_WORKFLOW_NAME: workflowName,
    })
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (!host || !keyId || !keySecret || !workflowName) {
      throw new OrkesNotConfiguredException(missing);
    }

    const trimmedHost = host.replace(/\/+$/, '');

    return {
      // The Orkes quickstart uses the /api URL, but the UI address is easy to
      // paste by mistake, and the CLI accepts either; do the same here.
      host: trimmedHost.endsWith('/api') ? trimmedHost : `${trimmedHost}/api`,
      keyId,
      keySecret,
      workflowName,
      workflowVersion: version === undefined || version === '' ? undefined : Number(version),
    };
  }
}
