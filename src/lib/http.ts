import { z } from "zod";

import { API_URL, API_VERSION, ACCESS_TOKEN_TTL_SECONDS } from "./config.js";
import {
  ApiError,
  ForbiddenError,
  NetworkError,
  NotAuthenticatedError,
  NotFoundError,
  RateLimitError,
  RefreshFailedError,
  ValidationError,
} from "./errors.js";
import {
  buildCredentials,
  clearCredentials,
  isAccessTokenExpired,
  loadCredentials,
  saveCredentials,
  type Credentials,
} from "./credentials.js";

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  skipApiVersion?: boolean;
}

const refreshResponseSchema = z.object({
  status: z.literal("success"),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

const errorResponseSchema = z.object({
  status: z.literal("error"),
  message: z.string(),
});

export async function apiRequest<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let credentials = await loadCredentials();

  if (isAccessTokenExpired(credentials)) {
    credentials = await refreshAndPersist(credentials);
  }

  let response = await sendRequest(method, path, options, credentials);

  if (response.status === 401) {
    credentials = await refreshAndPersist(credentials);
    response = await sendRequest(method, path, options, credentials);
  }

  return parseResponse<T>(response);
}

async function sendRequest(
  method: string,
  path: string,
  options: RequestOptions,
  credentials: Credentials,
): Promise<Response> {
  const url = new URL(path, API_URL);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${credentials.tokens.access}`,
    Accept: "application/json",
  };

  if (!options.skipApiVersion) {
    headers["X-API-Version"] = API_VERSION;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    return await fetch(url.toString(), {
      method,
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new NetworkError(err);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();

  if (response.ok) {
    if (rawBody === "") {
      return undefined as T;
    }
    try {
      return JSON.parse(rawBody) as T;
    } catch {
      throw new ApiError(
        response.status,
        "Invalid JSON in successful response",
      );
    }
  }

  const parsed = safeParseJson(rawBody);
  const errorParse = errorResponseSchema.safeParse(parsed);
  const message = errorParse.success
    ? errorParse.data.message
    : rawBody || `HTTP ${response.status}`;

  switch (response.status) {
    case 400:
      throw new ValidationError(message);
    case 403:
      throw new ForbiddenError(message);
    case 404:
      throw new NotFoundError(message);
    case 429: {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10)
        : undefined;
      throw new RateLimitError(
        message,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }
    default:
      throw new ApiError(response.status, message);
  }
}
async function refreshAndPersist(
  credentials: Credentials,
): Promise<Credentials> {
  let response: Response;
  try {
    response = await fetch(new URL("/auth/refresh", API_URL).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: credentials.tokens.refresh }),
    });
  } catch (err) {
    await clearCredentials();
    throw new RefreshFailedError(`Network error: ${(err as Error).message}`);
  }

  if (!response.ok) {
    await clearCredentials();
    throw new RefreshFailedError(`Server returned ${response.status}`);
  }

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody);
  const result = refreshResponseSchema.safeParse(parsed);

  if (!result.success) {
    await clearCredentials();
    throw new RefreshFailedError("Unexpected refresh response shape");
  }

  const updated = buildCredentials({
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    user: credentials.user,
    accessTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
  });

  await saveCredentials(updated);
  return updated;
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
export { NotAuthenticatedError };
