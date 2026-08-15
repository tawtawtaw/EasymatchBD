export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** True only when the server rejected the credential, never for timeouts or 5xx. */
export function isAuthRejection(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function messageFromApiErrorPayload(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const payload = body as { message?: string | string[]; error?: string };
    if (Array.isArray(payload.message)) {
      return payload.message.join(", ");
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  return `Request failed (${status})`;
}

export async function readApiError(response: Response): Promise<string> {
  try {
    return messageFromApiErrorPayload(await response.json(), response.status);
  } catch {
    return `Request failed (${response.status})`;
  }
}
