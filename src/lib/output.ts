import chalk from "chalk";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const CliTable3 = require("cli-table3") as new (options?: unknown) => {
  push: (row: unknown[]) => void;
  toString: () => string;
};
import type { Profile, PaginatedResponse } from "../types.js";

export function renderProfilesTable(
  profiles: Profile[],
  options: { fullIds?: boolean } = {},
): void {
  if (profiles.length === 0) {
    console.log(chalk.gray("No profiles found."));
    return;
  }

  const table = new CliTable3({
    head: [
      chalk.bold("ID"),
      chalk.bold("Name"),
      chalk.bold("Gender"),
      chalk.bold("Age"),
      chalk.bold("Group"),
      chalk.bold("Country"),
    ],
    style: { head: [], border: [] },
  });

  for (const p of profiles) {
    table.push([
      options.fullIds ? chalk.gray(p.id) : shortId(p.id),
      p.name,
      formatNullable(p.gender),
      formatNullable(p.age),
      formatNullable(p.age_group),
      formatCountry(p.country_id, p.country_name),
    ]);
  }

  console.log(table.toString());
}

export function renderProfileDetail(profile: Profile): void {
  const rows: Array<[string, string]> = [
    ["ID", profile.id],
    ["Name", profile.name],
    ["Gender", formatNullable(profile.gender)],
    [
      "Gender probability",
      profile.gender_probability !== null
        ? formatProbability(profile.gender_probability)
        : "—",
    ],
    ["Age", formatNullable(profile.age)],
    ["Age group", formatNullable(profile.age_group)],
    ["Country", formatCountry(profile.country_id, profile.country_name)],
    [
      "Country probability",
      profile.country_probability !== null
        ? formatProbability(profile.country_probability)
        : "—",
    ],
    ["Created", profile.created_at],
  ];

  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  for (const [label, value] of rows) {
    console.log(`${chalk.gray(label.padEnd(labelWidth))}  ${value}`);
  }
}

export function renderPaginationFooter<T>(
  response: PaginatedResponse<T>,
): void {
  const { page, total_pages, total } = response;
  const range =
    total === 0
      ? "0 results"
      : `Page ${page} of ${total_pages} · ${total} total`;

  console.log(chalk.gray(range));
}

function shortId(id: string): string {
  if (id.length <= 13) return chalk.gray(id);
  return chalk.gray(`${id.slice(0, 8)}…${id.slice(-4)}`);
}

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return chalk.gray("—");
  return String(value);
}

function formatCountry(
  countryId: string | null,
  countryName: string | null,
): string {
  if (countryId && countryName) return `${countryName} (${countryId})`;
  if (countryName) return countryName;
  if (countryId) return countryId;
  return chalk.gray("—");
}

function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}
