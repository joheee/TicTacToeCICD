# TicTacToeCICD

A small full-stack Next.js app (register/login, tic-tac-toe against a bot, PostgreSQL) used as the
sample workload for a CI/CD pipeline: GitHub Actions → Amazon ECR → EC2 via AWS SSM.
The pipeline is the point of the project; see `GOALS.md` for scope and status.

AWS infrastructure lives in a separate Terraform repo, **[TicTacToeInfra](https://github.com/joheee/TicTacToeInfra)**.
This repo never creates AWS resources.

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

## Deploy

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It runs after **CI passes on a
push to `main`** (never for PRs), or by hand from the Actions tab. Only one deploy runs at a time.

| Step | What happens |
|---|---|
| AWS login | GitHub OIDC → the deploy role from TicTacToeInfra. No AWS keys are stored anywhere. |
| Build and push | Same Dockerfile and `APP_VERSION` as CI, pushed to ECR as `<git SHA>`. Skipped if that tag is already in ECR (tags are immutable). |
| Deploy | [`deploy/ssm-run.sh`](deploy/ssm-run.sh) sends [`deploy/remote/deploy.sh`](deploy/remote/deploy.sh) and `docker-compose.yml` to the instance with SSM Run Command (no SSH). On the instance it writes `/opt/app/.env` from Parameter Store, logs in to ECR, pulls, runs the `migrate` service, then starts the new app. |
| Smoke test | [`deploy/smoke-test.sh`](deploy/smoke-test.sh) checks `APP_URL/api/health` returns 200 with `"version": "<git SHA>"` and `/login` returns 200, retrying for up to 2 minutes. |
| Mark good | Writes the SHA to `/opt/app/last_good_tag` (history in `/opt/app/deploy_history`). |
| Rollback | If the deploy or smoke test fails: redeploys `last_good_tag`, smoke tests it, and the run ends red. |

### One-time setup

1. Apply TicTacToeInfra.
2. Set the real values in Parameter Store (in TicTacToeInfra's region). Use a URL-safe password,
   for example `openssl rand -hex 24`, because it goes into `DATABASE_URL`:

   ```bash
   aws ssm put-parameter --overwrite --type SecureString --name /tictactoe/prod/POSTGRES_USER     --value app
   aws ssm put-parameter --overwrite --type SecureString --name /tictactoe/prod/POSTGRES_DB       --value tictactoe
   aws ssm put-parameter --overwrite --type SecureString --name /tictactoe/prod/POSTGRES_PASSWORD --value "$(openssl rand -hex 24)"
   ```

   Postgres only reads these on its very first start. Changing the password later also needs
   `ALTER USER` inside the database.
3. In this repo, go to **Settings → Secrets and variables → Actions → Variables** and add these
   repository variables from `terraform output` in TicTacToeInfra:

   | Variable | Terraform output |
   |---|---|
   | `AWS_REGION` | `aws_region` |
   | `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` |
   | `ECR_REPOSITORY_URL` | `ecr_repository_url` |
   | `EC2_INSTANCE_ID` | `instance_id` |
   | `APP_URL` | `app_url` |
   | `SSM_PARAM_PREFIX` | `ssm_parameter_prefix` |

4. Re-run the latest CI run on `main` (or push a commit). The first deploy has no rollback target
   until it passes.

### Runbook

- **Deploy:** merge to `main`. Watch the run under Actions → Deploy.
- **Redeploy the current commit:** Actions → Deploy → Run workflow (leave `break_health` off).
- **Roll back by hand:** revert the bad commit on `main`; CI and Deploy ship the revert. The
  automatic rollback already covers failed deploys.
- **Rollback demo:** Actions → Deploy → Run workflow with `break_health` on. It ships
  `<git SHA>-broken`, where `/api/health` returns 503, and you can watch the job roll back to the last
  good tag.
- **Migrations:** they run before the new app starts, and a rollback does not undo them, so schema
  changes must work with the previous app version (add columns as nullable or with defaults).
- **Look at the instance:** AWS console → Systems Manager → Session Manager, then
  `sudo docker compose -f /opt/app/docker-compose.yml ps` or `logs app`. Don't print `/opt/app/.env`;
  it holds the database password.
- **Rotate the DB password:** `ALTER USER` in Postgres, update `POSTGRES_PASSWORD` in Parameter Store,
  then redeploy.
