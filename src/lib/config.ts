const DEFAULT_API_URL =
  "https://profile-intelligence-production.up.railway.app";
const DEFAULT_API_VERSION = "1";

export const ACCESS_TOKEN_TTL_SECONDS = 3 * 60;

export const API_URL: string = process.env.INSIGHTA_API_URL ?? DEFAULT_API_URL;

export const API_VERSION: string =
  process.env.INSIGHTA_API_VERSION ?? DEFAULT_API_VERSION;
