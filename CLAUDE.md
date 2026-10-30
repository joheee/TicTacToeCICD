# CLAUDE.md

Read `GOALS.md` first. It defines what this project is for, what is in and out
of scope, and the definition of done. When a choice is unclear, pick the option
that makes the CI/CD story (build, push, deploy, smoke test, rollback) clearer.

## Context

- This is a DevOps portfolio project. The pipeline is the product; the app is a
  small full-stack Next.js app (register/login, tic-tac-toe page) with PostgreSQL.
- Everything runs in Docker Compose, locally and on EC2.
- Deploys go GitHub Actions → Amazon ECR → EC2 via AWS SSM, authenticated with
  GitHub OIDC.
- AWS infrastructure lives in a separate Terraform repo, **TicTacToeInfra**.
  This repo only uses its outputs (see "Two repos" in `GOALS.md`).

## Infrastructure boundary

- Never create, change or delete AWS resources from this repo: no Terraform
  here, no `aws ... create-*` in workflows or scripts, no console steps in the
  README. Workflows may only push images, send SSM commands and read SSM
  parameters, using the deploy role from TicTacToeInfra.
- Read AWS values from GitHub Actions variables (`vars.AWS_REGION`,
  `vars.AWS_DEPLOY_ROLE_ARN`, `vars.ECR_REPOSITORY_URL`, `vars.EC2_INSTANCE_ID`,
  `vars.APP_URL`, `vars.SSM_PARAM_PREFIX`). Never hard-code account IDs, ARNs,
  instance IDs or URLs.
- If a workflow needs a new permission, port or parameter, stop and say what
  TicTacToeInfra must add (resource and output name) instead of working
  around it.

## App state

The app is feature-complete for this project: auth, a tic-tac-toe game against a
flawed minimax bot, per-user scores, a Top 10 leaderboard, stored finished games
(`games` table) and a saved last board (`users.current_board`). The remaining
work is the pipeline, so don't add app features.

Code layout: game rules and bot in `src/lib/game.ts` (unit-tested), server
actions in `src/lib/play.ts` and `src/lib/actions.ts`, schema in
`src/lib/schema.ts`, migrations in `migrations/`.

## Pipeline state

- Done: `.github/workflows/ci.yml` runs on PRs and pushes to `main`. Two
  parallel jobs: lint/type-check/test (Node 22, `npm ci`) and a Docker Buildx
  build with `push: false`, tagged with `github.sha` and passing
  `APP_VERSION=${{ github.sha }}`. It has no AWS access and must stay that way.
- Written, not yet verified on AWS: `.github/workflows/deploy.yml` runs after
  CI succeeds on a push to `main` (`workflow_run`) or by hand. It builds and
  pushes `<sha>` to ECR (skips if the tag exists, tags are immutable), deploys
  with `deploy/ssm-run.sh deploy`, smoke tests with `deploy/smoke-test.sh`,
  records `/opt/app/last_good_tag` with `mark-good`, and on failure runs
  `rollback`. Keep AWS steps out of `ci.yml`.
- `deploy/ssm-run.sh` tars `docker-compose.yml` + `deploy/remote/` into the
  SSM command, so scripts under `deploy/remote/` run on the instance as root.
  They must never print `.env`. The deploy role only allows ECR push,
  `ssm:SendCommand` (AWS-RunShellScript, the one instance) and reading command
  results; anything else is a TicTacToeInfra change.
- The `break_health` dispatch input builds `<sha>-broken` with
  `FORCE_UNHEALTHY=1` so `/api/health` returns 503. It exists only for the
  rollback demo.
- The release build must use the same Dockerfile and `APP_VERSION` build arg as
  the CI build, so the image CI checked is the image that ships.
- These steps need TicTacToeInfra to exist and its outputs to be set as
  GitHub Actions variables. If they aren't set yet, say so instead of
  inventing values.
- `npm run lint` is `eslint .` (flat config in `eslint.config.mjs`), not
  `next lint`.
- The README's CI section is the pattern to follow: document each new workflow
  there (jobs, triggers, what it touches) in the same commit.

## Database and migrations

- Change the schema in `src/lib/schema.ts`, then run `npm run db:generate` and
  commit the new SQL file in `migrations/`. Never edit an applied migration.
- Apply locally with `npm run migrate` (it reads `DATABASE_URL` from `.env`;
  the host port is `DB_PORT`, 5433 by default). In Compose and on EC2 the
  `migrate` service runs it before the app starts, so migrations must be safe to
  run against the previous app version (add columns as nullable or with defaults).
- Never print `.env` or `DATABASE_URL`; they contain the password.

## Working rules

- Never commit secrets: no AWS keys, DB passwords or session secrets. Use
  `.env.example` with placeholders, GitHub Actions secrets and SSM Parameter Store.
- Keep the app small. Don't add features that aren't in `GOALS.md`.
- Image tags are the git SHA. Never deploy `latest`.
- Every workflow change must keep the rollback path working.
- Update the README runbook whenever deploy or rollback steps change.
- Tick the boxes in the GOALS.md "Definition of done" as items are finished.
