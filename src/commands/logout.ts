import chalk from "chalk";

import { apiRequest } from "../lib/http.js";
import { loadCredentials, clearCredentials } from "../lib/credentials.js";
import { NotAuthenticatedError } from "../lib/errors.js";

export async function logoutCommand(): Promise<void> {
  let refreshToken: string | undefined;
  try {
    const credentials = await loadCredentials();
    refreshToken = credentials.tokens.refresh;
  } catch (err) {
    if (err instanceof NotAuthenticatedError) {
      console.log(chalk.gray("Already logged out."));
      return;
    }
    throw err;
  }
  try {
    await apiRequest("POST", "/auth/logout", {
      body: { refresh_token: refreshToken },
      skipApiVersion: true,
    });
  } catch {
    // Swallow.
  }

  await clearCredentials();
  console.log(chalk.green("✔"), "Logged out.");
}
