# TicTacToeCICD

A small full-stack Next.js app (register/login, tic-tac-toe against a bot, PostgreSQL) used as the
sample workload for a CI/CD pipeline: GitHub Actions → Amazon ECR → EC2 via AWS SSM.
The pipeline is the point of the project; see `GOALS.md` for scope and status.

AWS infrastructure lives in a separate Terraform repo, **tictactoe-infra**. This repo never creates
AWS resources.

## Run locally

Requires Docker with Compose. Node 22 is only needed for the dev-server option.

### Option 1: everything in Docker Compose

```bash
cp .env.example .env        # then set POSTGRES_PASSWORD to something of your own
docker compose up --build
```

Compose starts Postgres, runs the migrations to completion, then starts the app.
Open <http://localhost:3000>, register a user and play.

Health check: <http://localhost:3000/api/health> returns `{"status":"ok","db":"up","version":"dev"}`.

Stop it with `docker compose down` (add `-v` to also delete the database volume).

### Option 2: Next.js dev server on the host, Postgres in Docker

```bash
cp .env.example .env
npm ci
npm run db:up               # starts only Postgres, on 127.0.0.1:${DB_PORT:-5433}
```

Create `.env.local` with the same user, password and database as `.env`, using the host port:

```
DATABASE_URL=postgres://app:<your-password>@localhost:5433/tictactoe
```

Then:

```bash
npm run migrate            # applies migrations/ to the database
npm run dev                # http://localhost:3000
```

`.env` and `.env.local` are git-ignored. Never commit them.

### Useful commands

| Command | What it does |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest, no database needed) |
| `npm run db:generate` | Generate a SQL migration after changing `src/lib/schema.ts` |
| `npm run migrate` | Apply migrations to the database in `.env` |

## CI

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It runs on every pull request and on
every push to `main`, and it never deploys or touches AWS (no credentials, no secrets).

| Job | Steps |
|---|---|
| **Lint, type-check, test** | Node 22, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` |
| **Docker build** | Builds the `Dockerfile` with Buildx, tagged with the git SHA, `push: false` |

- The two jobs run in parallel, so a failure in either one fails the check.
- The Docker job passes `APP_VERSION=<git SHA>`, the same build argument the release build will use,
  so `/api/health` reports which commit is running.
- A new push to a PR cancels that PR's older run. Runs on `main` are never cancelled.
- To make the checks block merges, require them in the repository's branch protection rules for
  `main` (a GitHub setting, not part of this repo).

Run the same checks locally before pushing:

```bash
npm ci && npm run lint && npm run typecheck && npm test
docker build --build-arg APP_VERSION=local -t tictactoe-app:check .
```

Build, push to ECR, deploy, smoke test and rollback are not implemented yet; they will be added as
separate workflows and documented here.
