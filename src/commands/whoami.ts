import chalk from "chalk";
import { z } from "zod";

import { apiRequest } from "../lib/http.js";
import { ConfigError } from "../lib/errors.js";

const meResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.enum(["admin", "analyst"]),
  }),
});

export async function whoamiCommand(): Promise<void> {
  const raw = await apiRequest<unknown>("GET", "/auth/me", {
    skipApiVersion: true,
  });

  const result = meResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError("Unexpected response from /auth/me");
  }

  const { username, email, role } = result.data.data;

  const lines = [
    `${chalk.bold("Logged in as")} ${chalk.cyan(`@${username}`)}`,
    `${chalk.gray("Role:")}        ${role}`,
  ];
  if (email) {
    lines.push(`${chalk.gray("Email:")}       ${email}`);
  }

  console.log(lines.join("\n"));
}
