# CLAUDE.md

Read `GOALS.md` first. It defines what this project is for, what is in and out
of scope, and the definition of done. When a choice is unclear, pick the option
that makes the CI/CD story (build, push, deploy, smoke test, rollback) clearer.

## Context

- This is a DevOps portfolio project. The pipeline is the product; the app is a
  small full-stack Next.js app (register/login, tic-tac-toe page) with PostgreSQL.
- Everything runs in Docker Compose, locally and on EC2. On EC2 a Caddy
  container terminates HTTPS in front of the app.
- Deploys go GitHub Actions → Amazon ECR → EC2 via AWS SSM, authenticated with
  GitHub OIDC.
- AWS infrastructure lives in a separate Terraform repo, **TicTacToeInfra**.
  This repo only uses its outputs (see "Two repos" in `GOALS.md`).
- The site is public (shared on social media), so treat it as exposed: no
  placeholder secrets, and don't run the `break_health` demo while the link is
  being shared.

## Infrastructure boundary

- Never create, change or delete AWS resources from this repo: no Terraform
  here, no `aws ... create-*` in workflows or scripts, no console steps in the
  README. Workflows may only push images, send SSM commands and read SSM
  parameters, using the deploy role from TicTacToeInfra.
- Read AWS values from GitHub Actions variables (`vars.AWS_REGION`,
  `vars.AWS_DEPLOY_ROLE_ARN`, `vars.ECR_REPOSITORY_URL`, `vars.EC2_INSTANCE_ID`,
  `vars.APP_URL`, `vars.SSM_PARAM_PREFIX`). Never hard-code account IDs, ARNs,
  instance IDs or URLs in workflows or scripts. `APP_URL` is the `https://` URL.
- If a workflow needs a new permission, port or parameter, stop and say what
  TicTacToeInfra must add (resource and output name) instead of working
  around it. The proxy needs inbound 80 and 443 on the instance's security
  group, and Parameter Store needs `SITE_ADDRESS` next to the `POSTGRES_*`
  values (both are in place).
- Do not add `environment:` to the deploy job. It changes the OIDC subject
  claim and the deploy role, which trusts `main`, would refuse the login.

## App state

The app is feature-complete for this project: auth, a tic-tac-toe game against a
flawed minimax bot, per-user scores, a Top 10 leaderboard, stored finished games
(`games` table) and a saved last board (`users.current_board`). The remaining
work is the pipeline, so don't add app features.

Done on the owner's request after the feature freeze, and frozen again: UI polish
(Tailwind tokens in `globals.css`), the portfolio brand in `src/components/Logo.tsx`,
show/hide password and a confirm-password field on register, and login hardening
(in-memory rate limits in `src/lib/rateLimit.ts`, a dummy bcrypt compare for unknown
users, a 72-byte password cap). Next.js is 16.

Code layout: game rules and bot in `src/lib/game.ts` (unit-tested), server
actions in `src/lib/play.ts` and `src/lib/actions.ts`, schema in
`src/lib/schema.ts`, migrations in `migrations/`.

## Pipeline state

- `.github/workflows/ci.yml` runs on PRs and pushes to `main`. Three parallel
  jobs: lint/type-check/test plus `npm audit --omit=dev --audit-level=high`
  (Node 22, `npm ci`); a gitleaks scan of the full history; and a Docker Buildx
  build (`push: false`, `load: true`, tagged `github.sha`, `APP_VERSION=${{ github.sha }}`)
  followed by a Trivy scan (fixable HIGH/CRITICAL fail the job, exceptions go in
  `.trivyignore` with a reason). It has no AWS access and must stay that way.
- `.github/workflows/deploy.yml` is verified on AWS. It runs after CI succeeds
  on a push to `main` (`workflow_run`) or by hand. It builds and pushes `<sha>`
  to ECR (skips if the tag exists, tags are immutable), deploys with
  `deploy/ssm-run.sh deploy`, smoke tests the public HTTPS URL with
  `deploy/smoke-test.sh`, records `/opt/app/last_good_tag` with `mark-good`, and
  on failure runs `rollback`. The rollback was demonstrated for real with
  `break_health`. Keep AWS steps out of `ci.yml`.
- `deploy/ssm-run.sh` tars `docker-compose.yml`, `Caddyfile` and `deploy/remote/`
  into the SSM command, so scripts under `deploy/remote/` run on the instance as
  root. They must never print `.env`. The deploy role only allows ECR push,
  `ssm:SendCommand` (AWS-RunShellScript, the one instance) and reading command
  results; anything else is a TicTacToeInfra change.
- `deploy/remote/deploy.sh` builds `/opt/app/.env` from Parameter Store, requires
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and `SITE_ADDRESS`, and adds
  `COMPOSE_PROFILES=proxy`, `COOKIE_SECURE=true` and `HSTS_MAX_AGE` defaults. The
  `proxy` service (Caddy, `Caddyfile`) is a Compose profile: off locally, on EC2.
- The `break_health` dispatch input builds `<sha>-broken` with
  `FORCE_UNHEALTHY=1` so `/api/health` returns 503. It exists only for the
  rollback demo.
- The release build must use the same Dockerfile and `APP_VERSION` build arg as
  the CI build, so the image CI checked is the image that ships. The runner stage
  deletes npm, npx, corepack and yarn on purpose (smaller image, fewer findings).
- Third-party actions are pinned to a full commit SHA with the tag in a comment.
  Keep new ones pinned (look the SHA up with `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`).
  Dependabot (`.github/dependabot.yml`) proposes updates weekly. The Docker base
  image stays on Node 22 LTS to match CI, so a Dependabot PR that moves it to a
  newer major should be closed unless CI moves too.
- `npm run lint` is `eslint .` (flat config in `eslint.config.mjs`, using the
  presets from `eslint-config-next`), not `next lint`.
- The README's CI and Deploy sections are the pattern to follow: document each
  new workflow or pipeline step there (jobs, triggers, what it touches) in the
  same commit.

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
- Commit or push only when asked: a push to `main` deploys to production.
