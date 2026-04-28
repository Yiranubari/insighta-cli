#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("insighta")
  .description("CLI for Insighta Labs+ Profile Intelligence System")
  .version("0.1.0", "-v, --version", "Display CLI version");

program
  .command("login")
  .description("Authenticate with GitHub via OAuth (PKCE)")
  .action(() => {
    console.log("login: not implemented yet");
  });

program
  .command("logout")
  .description("Clear stored credentials and invalidate session")
  .action(() => {
    console.log("logout: not implemented yet");
  });

program
  .command("whoami")
  .description("Display the currently authenticated user")
  .action(() => {
    console.log("whoami: not implemented yet");
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
  console.error(err);
  process.exit(1);
});
