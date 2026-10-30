# Project goals: One-day CI/CD for an app on EC2

This repo is portfolio project #4 for my Upwork DevOps profile. The point of the
project is the **pipeline**, not the app. A client should be able to look at this
repo and think "this person can set up CI/CD for my EC2 app in 48 hours".

## Two repos

The project is split the way a client's setup usually is:

| Repo | Holds | Changes when |
|---|---|---|
| **TicTacToeCICD** (this repo) | Next.js app, Dockerfile, Compose file, GitHub Actions workflows (CI, build, deploy, smoke test, rollback), README runbook | The app or the pipeline changes |
| **[TicTacToeInfra](https://github.com/joheee/TicTacToeInfra)** (Terraform) | Every AWS resource: ECR repo, EC2 instance with SSM, networking and security group, IAM instance role, GitHub OIDC provider and deploy role, SSM Parameter Store entries | The infrastructure changes |

This repo never creates AWS resources, by hand or by script. The pipeline only
*uses* what Terraform created, through these values copied from
`terraform output` into GitHub Actions **repository variables** (not secrets;
none of them are sensitive):

| Variable | Terraform output | Used for |
|---|---|---|
| `AWS_REGION` | `aws_region` | Every AWS call |
| `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` | OIDC login in the workflow |
| `ECR_REPOSITORY_URL` | `ecr_repository_url` | Image push and `IMAGE_REPO` on EC2 |
| `EC2_INSTANCE_ID` | `instance_id` | SSM Run Command target |
| `APP_URL` | `app_url` | Public smoke test |
| `SSM_PARAM_PREFIX` | `ssm_parameter_prefix` | Where the instance reads `.env` values (e.g. `/tictactoe/prod/`) |

If the pipeline needs something new from AWS (a permission, a port, a
parameter), the change goes into TicTacToeInfra first and its output is added
to the table above.

## The pitch (what a client buys)

> "CI/CD pipeline for your EC2 app, 48 hours." GitHub Actions builds a Docker
> image, pushes it to Amazon ECR, deploys to EC2 through AWS SSM, runs a smoke
> test, and rolls back automatically if the new version is broken.

It will be offered as a fixed-price Upwork Project Catalog item and matches jobs
like "Basic CI/CD pipeline for an app on EC2", "Guided AWS CI/CD session",
"Laravel API + GitHub Actions + Dockerfile" and "Maintain CI/CD".

## Objectives

1. **Sample app (kept small).** A full-stack Next.js app with register, login and
   logout, backed by PostgreSQL. After login the user lands on a simple
   tic-tac-toe page (matches the repo name). Exposes `GET /api/health` that
   checks the database connection and returns the app version.
   The game page (built, and now frozen unless the pipeline needs a change):
   - The human plays X against a deliberately flawed minimax bot (it plays a
     random move 30% of the time, so the human can win).
   - Per-user win/loss/draw counts and a Top 10 leaderboard.
   - Every finished game is stored in a `games` table (final board and outcome;
     move order is not kept).
   - The last board, finished or not, is saved on the user and shown again after
     a refresh or re-login. Only the "New game" button clears it.
   - The server validates every move and is the only writer of scores and games.
   These features also give the pipeline real migrations to run (`0000`-`0003`),
   which is what the "migrations run before the new app starts" step is for.
2. **Everything in Docker Compose.** `docker compose up` runs the Next.js app and
   Postgres locally and on EC2. Same compose file in both places; only env vars
   and the image tag change.
3. **CI on pull requests.** Lint, type-check, test and `docker build` on every PR.
   Nothing is deployed from a PR.
4. **Build and push on merge to `main`.** Build the image once, tag it with the
   git SHA, push to Amazon ECR.
5. **Deploy to EC2 without SSH keys.** GitHub Actions authenticates to AWS with
   **OIDC** (no stored access keys), assuming the deploy role created by
   TicTacToeInfra, and deploys with **AWS SSM Run Command** (no port 22 open).
   The instance builds its `.env` from SSM Parameter Store, pulls the new tag
   and restarts the app container. Database migrations run before the new app
   container starts.
6. **Smoke test.** After deploy, `curl` the health endpoint and the login page
   until they pass or a timeout hits.
7. **Automatic rollback.** If the smoke test fails, redeploy the last known-good
   image tag and fail the workflow. The previous tag is recorded on the instance
   (for example `/opt/app/last_good_tag`).
8. **Prove it.** A deliberate "bad deploy" (for example an env flag or a commit
   that makes `/api/health` return 500) that the pipeline rolls back on its own.
   This is what the 2–3 minute screen recording shows.
9. **Client-style README.** Architecture diagram, setup steps, runbook (deploy,
   manual rollback, rotate secrets), monthly cost estimate, and the recording.

## Out of scope

- Kubernetes, ECS (those are projects 1 and 7).
- Any Terraform or AWS resource creation in this repo. That lives in
  TicTacToeInfra; this repo only reads its outputs.
- Fancy UI. Plain, clean pages are fine (Tailwind styling is already in; no more
  UI work).
- More game features: game history page, replays, move-by-move storage,
  multiplayer. The app is done; spend the remaining time on the pipeline.
- Managed RDS. Postgres runs in Compose with a named volume, so the demo stays
  cheap; the README mentions RDS as the production upgrade.

## Status (checked 30 Oct 2026)

| # | Objective | State |
|---|---|---|
| 1 | Sample app | Done. Auth, game, leaderboard, `/api/health`, migrations `0000`–`0003`. |
| 2 | Docker Compose | Done locally (db → migrate → app). Not run on EC2 yet. |
| 3 | CI on pull requests | Done. `.github/workflows/ci.yml`: lint, type-check, test and a Docker build (`push: false`, tagged with the git SHA). Runs on PRs and pushes to `main`; green on `main`. |
| 4 | Build and push to ECR | Written (`deploy.yml`), not yet run against AWS. |
| 5 | Deploy to EC2 via SSM + OIDC | Written (`deploy/ssm-run.sh`, `deploy/remote/deploy.sh`), not yet run. |
| 6 | Smoke test | Written (`deploy/smoke-test.sh`), not yet run. |
| 7 | Automatic rollback | Written (`deploy/remote/rollback.sh`, `last_good_tag`), not yet run. |
| 8 | Recorded bad deploy | Switch is in (`break_health` input, `FORCE_UNHEALTHY`); recording not made. |
| 9 | Client-style README | Local run, CI, deploy, one-time setup and runbook are written; diagram, cost estimate and recording are still missing. |

TicTacToeInfra is applied. Next: set the repository variables and Parameter
Store values (README, "One-time setup"), then let the first deploy run.

## Plan (1–2 days)

| When | Work |
|---|---|
| Day 1 morning ✓ | Next.js app: register/login/logout, Postgres schema + migrations, `/api/health`, Dockerfile (multi-stage, standalone output), `docker-compose.yml`. Runs locally. |
| Day 1 afternoon (PR workflow ✓) | TicTacToeInfra applied (see that repo's GOALS.md); its outputs copied into this repo's GitHub Actions variables. PR workflow ✓ and build-push-deploy workflow working end to end. |
| Day 2 morning | Smoke test, automatic rollback, the "bad deploy" switch, rollback tested for real. |
| Day 2 afternoon | README handover, architecture diagram, cost estimate, screen recording, Upwork portfolio entry. |

## Tools and software

GitHub Actions · Docker · Docker Compose · Amazon ECR · Amazon EC2 ·
AWS SSM (Run Command) · AWS IAM OIDC · Next.js (App Router, TypeScript) ·
PostgreSQL · curl smoke tests · draw.io for the diagram

App-level choices (made): Drizzle for the schema and migrations, bcryptjs for
password hashing, httpOnly session cookies for auth.

## Definition of done

- [x] `docker compose up` runs the app and Postgres locally; register and login work.
- [x] PR workflow runs lint, tests and a Docker build.
- [ ] Merge to `main` builds, pushes to ECR and deploys to EC2 via SSM using OIDC.
- [ ] Every AWS value the workflows use comes from a GitHub Actions variable
      that matches a TicTacToeInfra output; nothing AWS is created from here.
- [ ] Smoke test runs after every deploy.
- [ ] A broken deploy rolls itself back to the previous image with no manual step.
- [ ] No AWS keys, DB passwords or session secrets committed; secrets live in
      GitHub Actions secrets and SSM Parameter Store.
- [ ] README has the diagram, runbook, rollback steps, cost estimate and recording link.
