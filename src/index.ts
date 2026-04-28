#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { AppError } from "./lib/errors.js";
import type { ListOptions } from "./commands/profiles/list.js";
import type { SearchOptions } from "./commands/profiles/search.js";
import type { CreateOptions } from "./commands/profiles/create.js";
import type { ExportOptions } from "./commands/profiles/export.js";

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
  .option("--gender <gender>", "Filter by gender (male|female)")
  .option("--country <code>", "Filter by 2-letter country code (e.g. NG)")
  .option(
    "--age-group <group>",
    "Filter by age group (child|teen|adult|senior)",
  )
  .option("--min-age <years>", "Minimum age (inclusive)")
  .option("--max-age <years>", "Maximum age (inclusive)")
  .option("--sort-by <field>", "Sort field (age|created_at|gender_probability)")
  .option("--order <direction>", "Sort direction (asc|desc)")
  .option("--page <n>", "Page number")
  .option("--limit <n>", "Results per page (max 100)")
  .option("--full-ids", "Show full UUIDs instead of truncated")
  .action(async (opts: ListOptions) => {
    const { listCommand } = await import("./commands/profiles/list.js");
    await listCommand(opts);
  });

profiles
  .command("get <id>")
  .description("Get a single profile by ID")
  .action(async (id: string) => {
    const { getCommand } = await import("./commands/profiles/get.js");
    await getCommand(id);
  });

profiles
  .command("search <query>")
  .description("Natural language search over profiles")
  .option("--page <n>", "Page number")
  .option("--limit <n>", "Results per page (max 100)")
  .option("--full-ids", "Show full UUIDs instead of truncated")
  .action(async (query: string, opts: SearchOptions) => {
    const { searchCommand } = await import("./commands/profiles/search.js");
    await searchCommand(query, opts);
  });

profiles
  .command("create")
  .description("Create a new profile (admin only)")
  .requiredOption("--name <name>", "Name to enrich and store")
  .action(async (opts: CreateOptions) => {
    const { createCommand } = await import("./commands/profiles/create.js");
    await createCommand(opts);
  });

profiles
  .command("export")
  .description("Export profiles to CSV")
  .option("--format <format>", "Export format (csv)", "csv")
  .option("--gender <gender>", "Filter by gender (male|female)")
  .option("--country <code>", "Filter by 2-letter country code (e.g. NG)")
  .option(
    "--age-group <group>",
    "Filter by age group (child|teenager|adult|senior)",
  )
  .option("--min-age <years>", "Minimum age (inclusive)")
  .option("--max-age <years>", "Maximum age (inclusive)")
  .option("--sort-by <field>", "Sort field (age|created_at|gender_probability)")
  .option("--order <direction>", "Sort direction (asc|desc)")
  .action(async (opts: ExportOptions) => {
    const { exportCommand } = await import("./commands/profiles/export.js");
    await exportCommand(opts);
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
