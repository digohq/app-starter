import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';

export class OrkesNotConfiguredException extends ServiceUnavailableException {
  constructor(missing: readonly string[]) {
    super(`Orkes is not configured. Missing: ${missing.join(', ')}`);
  }
}

export class OrkesRequestFailedException extends BadGatewayException {
  constructor(action: string, status: number) {
    super(`Orkes request to ${action} failed with status ${status}`);
  }
}

/**
 * A 200 with an HTML body means the request reached the Orkes web UI rather
 * than its API, almost always because the server URL is the UI address.
 */
export class OrkesUnexpectedResponseException extends BadGatewayException {
  constructor(action: string) {
    super(
      `Orkes returned a web page instead of data for ${action}. ` +
        'Check that CONDUCTOR_SERVER_URL is the API address, ending in /api.',
    );
  }
}
