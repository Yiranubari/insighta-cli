export abstract class AppError extends Error {
  abstract readonly userMessage: string;
  abstract readonly exitCode: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
export class NotAuthenticatedError extends AppError {
  readonly userMessage = "You are not logged in. Run `insighta login` first.";
  readonly exitCode = 2;

  constructor() {
    super("No credentials found");
  }
}

export class ConfigError extends AppError {
  readonly userMessage: string;
  readonly exitCode = 2;

  constructor(detail: string) {
    super(`Config error: ${detail}`);
    this.userMessage = `Configuration problem: ${detail}`;
  }
}

export class OAuthStateMismatchError extends AppError {
  readonly userMessage =
    "OAuth callback rejected: state parameter did not match. " +
    "This may indicate a security issue. Please try logging in again.";
  readonly exitCode = 2;

  constructor() {
    super("OAuth state mismatch");
  }
}

export class TokenExpiredError extends AppError {
  readonly userMessage = "Session expired. Refreshing...";
  readonly exitCode = 2;

  constructor() {
    super("Access token expired");
  }
}

export class RefreshFailedError extends AppError {
  readonly userMessage =
    "Your session has expired. Please run `insighta login` to sign in again.";
  readonly exitCode = 2;

  constructor(detail?: string) {
    super(detail ? `Refresh failed: ${detail}` : "Refresh failed");
  }
}
export class NetworkError extends AppError {
  readonly userMessage =
    "Could not reach the server. Check your internet connection and try again.";
  readonly exitCode = 3;

  constructor(cause: unknown) {
    super("Network request failed", { cause });
  }
}

export class ApiError extends AppError {
  readonly userMessage: string;
  readonly exitCode: number = 1;
  constructor(
    readonly statusCode: number,
    readonly serverMessage: string,
    userMessage?: string,
  ) {
    super(`API ${statusCode}: ${serverMessage}`);
    this.userMessage =
      userMessage ?? `Server error (${statusCode}): ${serverMessage}`;
  }
}

export class ForbiddenError extends ApiError {
  override readonly exitCode = 2;

  constructor(serverMessage: string) {
    super(
      403,
      serverMessage,
      `Access denied: ${serverMessage}. Your role may not permit this action.`,
    );
  }
}

export class NotFoundError extends ApiError {
  constructor(serverMessage: string) {
    super(404, serverMessage, `Not found: ${serverMessage}`);
  }
}

export class ValidationError extends ApiError {
  override readonly exitCode = 4;

  constructor(serverMessage: string) {
    super(400, serverMessage, `Invalid request: ${serverMessage}`);
  }
}

export class RateLimitError extends ApiError {
  constructor(
    serverMessage: string,
    readonly retryAfterSeconds?: number,
  ) {
    const hint =
      retryAfterSeconds !== undefined
        ? ` Try again in ${retryAfterSeconds}s.`
        : " Please wait a moment and try again.";
    super(429, serverMessage, `Rate limited: ${serverMessage}.${hint}`);
  }
}
