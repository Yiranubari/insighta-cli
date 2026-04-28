import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { z } from "zod";

import { ConfigError, NotAuthenticatedError } from "./errors.js";

const CONFIG_DIR = join(homedir(), ".insighta");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");

const credentialsSchema = z.object({
  tokens: z.object({
    access: z.string().min(1),
    refresh: z.string().min(1),
    expires_at: z.number().int().positive(),
  }),
  user: z.object({
    username: z.string().min(1),
    github_id: z.string().min(1),
    role: z.enum(["admin", "analyst"]),
  }),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export async function loadCredentials(): Promise<Credentials> {
  let raw: string;
  try {
    raw = await readFile(CREDENTIALS_FILE, "utf8");
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") {
      throw new NotAuthenticatedError();
    }
    throw new ConfigError(
      `Could not read credentials file: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(
      `Credentials file is not valid JSON. Run \`insighta login\` to recreate it.`,
    );
  }

  const result = credentialsSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(
      `Credentials file has unexpected shape. Run \`insighta login\` to recreate it.`,
    );
  }

  return result.data;
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const json = JSON.stringify(credentials, null, 2);
  await writeFile(CREDENTIALS_FILE, json, { mode: 0o600 });
}

export async function clearCredentials(): Promise<void> {
  try {
    await unlink(CREDENTIALS_FILE);
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return; // already gone, fine
    }
    throw new ConfigError(
      `Could not delete credentials file: ${(err as Error).message}`,
    );
  }
}

export function buildCredentials(input: {
  accessToken: string;
  refreshToken: string;
  user: { username: string; github_id: string; role: "admin" | "analyst" };
  accessTtlSeconds: number;
}): Credentials {
  const SAFETY_BUFFER_MS = 5_000;
  const expires_at =
    Date.now() + input.accessTtlSeconds * 1000 - SAFETY_BUFFER_MS;

  return {
    tokens: {
      access: input.accessToken,
      refresh: input.refreshToken,
      expires_at,
    },
    user: input.user,
  };
}

export function isAccessTokenExpired(credentials: Credentials): boolean {
  return Date.now() >= credentials.tokens.expires_at;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
