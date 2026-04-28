import ora from "ora";

import { apiRequest } from "../../lib/http.js";
import { renderProfileDetail } from "../../lib/output.js";
import type { Profile } from "../../types.js";

interface CreateResponse {
  status: "success";
  data: Profile;
}

export interface CreateOptions {
  name: string;
}

export async function createCommand(options: CreateOptions): Promise<void> {
  if (!options.name.trim()) {
    throw new Error("--name cannot be empty");
  }

  const spinner = ora(`Creating profile for "${options.name}"...`).start();

  let response: CreateResponse;
  try {
    response = await apiRequest<CreateResponse>("POST", "/api/profiles", {
      body: { name: options.name },
    });
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();
  renderProfileDetail(response.data);
}
