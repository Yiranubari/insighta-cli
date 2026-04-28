import ora from "ora";

import { apiRequest } from "../../lib/http.js";
import { renderProfileDetail } from "../../lib/output.js";
import type { Profile } from "../../types.js";

interface GetResponse {
  status: "success";
  data: Profile;
}

export async function getCommand(id: string): Promise<void> {
  const spinner = ora(`Fetching profile ${id}...`).start();

  let response: GetResponse;
  try {
    response = await apiRequest<GetResponse>("GET", `/api/profiles/${id}`);
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();
  renderProfileDetail(response.data);
}
