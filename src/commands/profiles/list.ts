import ora from "ora";

import { apiRequest } from "../../lib/http.js";
import {
  renderProfilesTable,
  renderPaginationFooter,
} from "../../lib/output.js";
import { validateFilters, filtersToQuery } from "../../lib/validators.js";
import type { Profile, PaginatedResponse } from "../../types.js";

export interface ListOptions {
  gender?: string;
  country?: string;
  ageGroup?: string;
  minAge?: string;
  maxAge?: string;
  sortBy?: string;
  order?: string;
  page?: string;
  limit?: string;
  fullIds?: boolean;
}

export async function listCommand(rawOptions: ListOptions): Promise<void> {
  const filters = validateFilters(rawOptions);
  const query = filtersToQuery(filters);

  const spinner = ora("Fetching profiles...").start();

  let response: PaginatedResponse<Profile>;
  try {
    response = await apiRequest<PaginatedResponse<Profile>>(
      "GET",
      "/api/profiles",
      { query },
    );
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();

  renderProfilesTable(response.data, { fullIds: rawOptions.fullIds });
  renderPaginationFooter(response);
}
