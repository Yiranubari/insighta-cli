import chalk from "chalk";
import ora from "ora";
import { z } from "zod";

import { API_URL, ACCESS_TOKEN_TTL_SECONDS } from "../lib/config.js";
import {
  ApiError,
  ConfigError,
  NetworkError,
  ValidationError,
} from "../lib/errors.js";
import { performOAuthFlow } from "../lib/oauth.js";
import { buildCredentials, saveCredentials } from "../lib/credentials.js";

const exchangeResponseSchema = z.object({
  status: z.literal("success"),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.enum(["admin", "analyst"]),
  }),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

const errorResponseSchema = z.object({
  status: z.literal("error"),
  message: z.string(),
});

export async function loginCommand(): Promise<void> {
  const spinner = ora({
    text: "Opening GitHub in your browser...",
    spinner: "dots",
  }).start();

  let auth_code: string;
  let code_verifier: string;
  try {
    ({ auth_code, code_verifier } = await performOAuthFlow());
  } catch (err) {
    spinner.fail("OAuth flow failed");
    throw err instanceof Error
      ? new ConfigError(`OAuth flow failed: ${err.message}`)
      : new ConfigError("OAuth flow failed");
  }

  spinner.text = "Exchanging authorization code...";

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/cli/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_code, code_verifier }),
    });
  } catch (err) {
    spinner.fail("Could not reach the server");
    throw new NetworkError(err);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    spinner.fail("Login failed");
    const parsed = safeParseJson(rawBody);
    const errorParse = errorResponseSchema.safeParse(parsed);
    const message = errorParse.success ? errorParse.data.message : rawBody;

    if (response.status === 400) {
      throw new ValidationError(message);
    }
    throw new ApiError(response.status, message);
  }

  const parsed = safeParseJson(rawBody);
  const result = exchangeResponseSchema.safeParse(parsed);
  if (!result.success) {
    spinner.fail("Login failed");
    throw new ConfigError("Unexpected response from /auth/cli/exchange");
  }

  const credentials = buildCredentials({
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    user: {
      username: result.data.user.username,
      github_id: result.data.user.id,
      role: result.data.user.role,
    },
    accessTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
  });

  await saveCredentials(credentials);

  spinner.succeed(
    `Logged in as ${chalk.cyan(`@${result.data.user.username}`)} ${chalk.gray(`(${result.data.user.role})`)}`,
  );
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
