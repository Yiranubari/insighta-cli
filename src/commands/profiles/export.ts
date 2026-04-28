import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ora from "ora";
import chalk from "chalk";

import { API_URL, API_VERSION } from "../../lib/config.js";
import {
  ApiError,
  ForbiddenError,
  NetworkError,
  NotAuthenticatedError,
  RateLimitError,
  ValidationError,
} from "../../lib/errors.js";
import { loadCredentials } from "../../lib/credentials.js";
import { validateFilters, filtersToQuery } from "../../lib/validators.js";

export interface ExportOptions {
  format?: string;
  gender?: string;
  country?: string;
  ageGroup?: string;
  minAge?: string;
  maxAge?: string;
  sortBy?: string;
  order?: string;
}

export async function exportCommand(rawOptions: ExportOptions): Promise<void> {
  if (rawOptions.format && rawOptions.format !== "csv") {
    throw new ValidationError(
      `Unsupported format: ${rawOptions.format}. Only 'csv' is supported.`,
    );
  }

  const filters = validateFilters(rawOptions);
  const query = { ...filtersToQuery(filters), format: "csv" };

  const url = new URL("/api/profiles/export", API_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  const spinner = ora("Exporting profiles...").start();

  const credentials = await loadCredentials();

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.tokens.access}`,
        "X-API-Version": API_VERSION,
        Accept: "text/csv",
      },
    });
  } catch (err) {
    spinner.stop();
    throw new NetworkError(err);
  }

  if (!response.ok) {
    spinner.stop();
    const message = await response
      .text()
      .catch(() => `HTTP ${response.status}`);

    switch (response.status) {
      case 400:
        throw new ValidationError(message);
      case 401:
        throw new NotAuthenticatedError();
      case 403:
        throw new ForbiddenError(message);
      case 429: {
        const retryAfter = response.headers.get("retry-after");
        throw new RateLimitError(
          message,
          retryAfter ? Number.parseInt(retryAfter, 10) : undefined,
        );
      }
      default:
        throw new ApiError(response.status, message);
    }
  }

  const csv = await response.text();
  const filename =
    parseFilename(response.headers.get("content-disposition")) ??
    `profiles_${Date.now()}.csv`;
  const outputPath = resolve(process.cwd(), filename);

  await writeFile(outputPath, csv, "utf8");

  spinner.stop();
  console.log(
    chalk.green("✔"),
    `Exported ${countLines(csv) - 1} profiles to ${chalk.cyan(filename)}`,
  );
}

function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? null;
}

function countLines(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  if (text.length > 0 && !text.endsWith("\n")) count++;
  return count;
}
