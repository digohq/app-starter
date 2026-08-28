import { API_BASE_URL } from './api-client';
import { authStorage } from './auth-storage';
import { ApiError } from '@app-starter/shared';

/**
 * Download an authenticated file from the API.
 *
 * Fetches `path` (relative to `API_BASE_URL`) with the current Bearer token,
 * creates an object URL from the response blob, triggers a download via a
 * temporary anchor element, and cleans up.  The `Content-Disposition` header
 * supplied by the server takes precedence over `fallbackName`.
 */
export async function downloadAuthedFile(path: string, fallbackName: string): Promise<void> {
  const token = authStorage.getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!res.ok) {
    throw { message: 'Could not download file', statusCode: res.status } as ApiError;
  }

  // Honour server-set filename when present.
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";\r\n]+)"?/i);
  const filename = match?.[1] ?? fallbackName;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
