#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { AppError } from "./lib/errors.js";

const program = new Command();

program
  .name("insighta")
  .description("CLI for Insighta Labs+ Profile Intelligence System")
  .version("0.1.0", "-v, --version", "Display CLI version");

program
  .command("login")
  .description("Authenticate with GitHub via OAuth (PKCE)")
  .action(async () => {
    const { loginCommand } = await import("./commands/login.js");
    await loginCommand();
  });

program
  .command("logout")
  .description("Clear stored credentials and invalidate session")
  .action(async () => {
    const { logoutCommand } = await import("./commands/logout.js");
    await logoutCommand();
  });

program
  .command("whoami")
  .description("Display the currently authenticated user")
  .action(async () => {
    const { whoamiCommand } = await import("./commands/whoami.js");
    await whoamiCommand();
  });

const profiles = program.command("profiles").description("Manage profiles");

profiles
  .command("list")
  .description("List profiles with optional filters and pagination")
  .action(() => {
    console.log("profiles list: not implemented yet");
  });

profiles
  .command("get <id>")
  .description("Get a single profile by ID")
  .action((id: string) => {
    console.log(`profiles get ${id}: not implemented yet`);
  });

profiles
  .command("search <query>")
  .description("Natural language search over profiles")
  .action((query: string) => {
    console.log(`profiles search "${query}": not implemented yet`);
  });

profiles
  .command("create")
  .description("Create a new profile (admin only)")
  .requiredOption("--name <name>", "Name to enrich and store")
  .action((opts: { name: string }) => {
    console.log(`profiles create --name "${opts.name}": not implemented yet`);
  });

profiles
  .command("export")
  .description("Export profiles to CSV")
  .action(() => {
    console.log("profiles export: not implemented yet");
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof AppError) {
    console.error(chalk.red("✖"), err.userMessage);
    process.exit(err.exitCode);
  }
  console.error(chalk.red("✖"), "An unexpected error occurred.");
  if (process.env.INSIGHTA_DEBUG) {
    console.error(err);
  } else {
    console.error(
      chalk.gray("  Run with INSIGHTA_DEBUG=1 to see the full stack trace."),
    );
  }
  process.exit(1);
});
