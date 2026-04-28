# Insighta CLI

A command line tool for the Insighta Labs+ profile intelligence platform. Built with Node.js and TypeScript.

This is one of three repositories that make up the system:

- Backend: https://github.com/Yiranubari/profile-intelligence
- CLI: this repo
- Web portal: https://github.com/Yiranubari/insighta-web

## What it does

Lets you sign in with GitHub from your terminal and then run commands against the Insighta backend. You can list profiles, filter them, search using natural language, view a single profile, create new profiles (admin only), and export results as CSV.

## Installing

You need Node.js 18 or newer. Then:
npm install -g @yiranubari/insighta-cli

After that, the `insighta` command is available from any directory.

If you want to run it from source instead, clone the repo and:
npm install
npm run build
npm link

## Configuration

By default the CLI talks to the deployed backend at `https://profile-intelligence-production.up.railway.app`. If you want to point it somewhere else (for example a local backend during development), set the `INSIGHTA_API_URL` environment variable:
INSIGHTA_API_URL=http://localhost:8081 insighta login

Credentials are stored at `~/.insighta/credentials.json` after you log in. The file is created with permissions `0600` so only your user account can read it.

## Commands

### Auth
insighta login
insighta logout
insighta whoami

`login` opens your browser, walks you through GitHub OAuth, and saves the resulting tokens locally. `logout` revokes your session and clears the credentials file. `whoami` prints your username, role, and email.

### Profiles
insighta profiles list
insighta profiles list --gender female --country NG
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc
insighta profiles list --page 2 --limit 50
insighta profiles list --full-ids

The `list` command supports filters for gender, country, age group, age range, sorting, and pagination. By default the table shows truncated UUIDs (the first 8 characters and last 4) so rows fit cleanly. Pass `--full-ids` if you need the full identifier.
insighta profiles get <id>

Shows full details for one profile.
insighta profiles search "young males from nigeria"
insighta profiles search "adult women in kenya"

Natural language search. The backend parses the query and returns matching profiles.
insighta profiles create --name "Harriet Tubman"

Admin only. Creates a new profile by sending the name to the backend, which enriches it with gender, age, and country data from external services and stores the result.
insighta profiles export --format csv
insighta profiles export --format csv --gender male --country NG

Downloads matching profiles as a CSV file in your current directory. Supports the same filters as `list`.

## How auth works

The CLI uses the OAuth 2.0 PKCE flow described in RFC 8252. When you run `insighta login`:

1. The CLI generates a random `code_verifier`, derives a SHA-256 `code_challenge` from it, and generates a CLI-side state value.
2. The CLI starts a temporary HTTP server on `127.0.0.1` on a random port the OS assigns.
3. Your browser opens to the backend's `/auth/github` endpoint with the code challenge, port, and state as query parameters.
4. The backend stores those values, then redirects you to GitHub for sign in.
5. After GitHub sends you back to the backend, the backend redirects your browser to `http://127.0.0.1:<port>/callback` with an auth code and the same state.
6. The CLI's temporary server receives that callback, checks the state matches what it sent, and shuts down.
7. The CLI sends the auth code along with the original code verifier to `/auth/cli/exchange`. The backend verifies the verifier matches the challenge, then issues an access token and refresh token.
8. The tokens get saved to `~/.insighta/credentials.json` and the spinner shows "Logged in as @yourname".

PKCE protects against an attacker who intercepts the auth code, since they would not have the original code verifier. The state check prevents CSRF on the loopback callback.

## How tokens work

The backend issues short lived access tokens (3 minutes) and slightly longer refresh tokens (5 minutes). The CLI stores both, along with a computed `expires_at` timestamp.

Before each request, the CLI checks whether the access token is close to expiry. If it is, the CLI calls `/auth/refresh` first, gets a new pair, saves them, and only then makes the original request. If the access token is fresh but the server still returns 401 (clock skew, revocation, etc.), the CLI tries refresh once and retries the request. If refresh itself fails, the CLI deletes the credentials file so the next command shows a clear "please log in again" message instead of looping.

Refresh tokens are rotated on every refresh call, so a single refresh token can only be used once. This is enforced by the backend.

## Errors

Every error you see has a typed cause behind it. The CLI maps backend responses and local failures to a small set of error classes (`NotAuthenticatedError`, `RefreshFailedError`, `ForbiddenError`, `RateLimitError`, etc.) and the top level handler prints a single short message with a red `x` symbol.

If you want to see the full stack trace for debugging, run any command with `INSIGHTA_DEBUG=1`:
INSIGHTA_DEBUG=1 insighta whoami

## Development
npm install
npm run dev          # run via tsx, no build step
npm run build        # compile to dist/
npm run typecheck    # tsc --noEmit
npm run lint         # eslint

CI runs typecheck, lint, and build on every PR to main.

## Project layout
src/
index.ts                    # bin entry, commander setup, top level error handler
types.ts                    # shared types for profiles, pagination, enums
commands/
login.ts
logout.ts
whoami.ts
profiles/
list.ts
get.ts
search.ts
create.ts
export.ts
lib/
config.ts                 # env vars and constants
credentials.ts            # credentials file read/write
errors.ts                 # AppError hierarchy
http.ts                   # apiRequest wrapper with auto refresh
oauth.ts                  # PKCE, loopback server, browser handoff
output.ts                 # table rendering, profile detail formatting
validators.ts             # zod schemas for filter input
