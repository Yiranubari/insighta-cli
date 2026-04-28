import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import open from "open";

import { API_URL } from "./config.js";
import { ConfigError } from "./errors.js";

function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

function deriveCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
interface CallbackResult {
  auth_code: string;
}

async function awaitCallback(): Promise<{
  port: number;
  result: Promise<CallbackResult>;
}> {
  let resolveResult: (value: CallbackResult) => void;
  let rejectResult: (reason: Error) => void;

  const result = new Promise<CallbackResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      if (!req.url) {
        respondAndClose(res, 400, "Bad request");
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1`);
      if (url.pathname !== "/callback") {
        respondAndClose(res, 404, "Not found");
        return;
      }

      const authCode = url.searchParams.get("auth_code");
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        respondAndClose(
          res,
          400,
          renderHtml(
            "Login failed",
            `Error: ${escapeHtml(errorParam)}. You may close this tab.`,
          ),
          "text/html",
        );
        rejectResult(new Error(`OAuth error: ${errorParam}`));
        server.close();
        return;
      }

      if (!authCode) {
        respondAndClose(
          res,
          400,
          renderHtml(
            "Login failed",
            "Missing auth_code in callback. You may close this tab.",
          ),
          "text/html",
        );
        rejectResult(new Error("Callback missing auth_code"));
        server.close();
        return;
      }

      respondAndClose(
        res,
        200,
        renderHtml(
          "Logged in",
          "You can close this tab and return to your terminal.",
        ),
        "text/html",
      );
      resolveResult({ auth_code: authCode });
      server.close();
    },
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    server.close();
    throw new ConfigError("Could not determine loopback server port");
  }

  return { port: address.port, result };
}

function respondAndClose(
  res: ServerResponse,
  status: number,
  body: string,
  contentType = "text/plain",
): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function renderHtml(title: string, message: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#222}h1{font-size:1.25rem}</style>
</head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export interface OAuthFlowResult {
  auth_code: string;
  code_verifier: string;
}

export async function performOAuthFlow(): Promise<OAuthFlowResult> {
  const code_verifier = generateCodeVerifier();
  const code_challenge = deriveCodeChallenge(code_verifier);

  const { port, result } = await awaitCallback();

  const authUrl = new URL("/auth/github", API_URL);
  authUrl.searchParams.set("client_type", "cli");
  authUrl.searchParams.set("code_challenge", code_challenge);
  authUrl.searchParams.set("cli_port", String(port));

  await open(authUrl.toString());

  const { auth_code } = await result;
  return { auth_code, code_verifier };
}
