import ora from "ora";

import { apiRequest } from "../../lib/http.js";
import {
  renderProfilesTable,
  renderPaginationFooter,
} from "../../lib/output.js";
import type { Profile, PaginatedResponse } from "../../types.js";

export interface SearchOptions {
  page?: string;
  limit?: string;
  fullIds?: boolean;
}

export async function searchCommand(
  query: string,
  rawOptions: SearchOptions,
): Promise<void> {
  const queryParams: Record<string, string | number> = { q: query };
  if (rawOptions.page) queryParams.page = rawOptions.page;
  if (rawOptions.limit) queryParams.limit = rawOptions.limit;

  const spinner = ora(`Searching: ${query}`).start();

  let response: PaginatedResponse<Profile>;
  try {
    response = await apiRequest<PaginatedResponse<Profile>>(
      "GET",
      "/api/profiles/search",
      { query: queryParams },
    );
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();

  renderProfilesTable(response.data, { fullIds: rawOptions.fullIds });
  renderPaginationFooter(response);
}
