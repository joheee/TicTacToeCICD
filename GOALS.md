# Project goals: One-day CI/CD for an app on EC2

This repo is portfolio project #4 for my Upwork DevOps profile. The point of the
project is the **pipeline**, not the app. A client should be able to look at this
repo and think "this person can set up CI/CD for my EC2 app in 48 hours".

## Repos

The project is split the way a client's setup usually is. Since 2 Nov 2026 the
app is also moving to a DigitalOcean Droplet (portfolio project #2); this repo
owns that pipeline too.

| Repo | Holds | Changes when |
|---|---|---|
| **TicTacToeCICD** (this repo) | Next.js app, Dockerfile, Compose file, GitHub Actions workflows (CI, build, deploy, smoke test, rollback), README runbook | The app or the pipeline changes |
| **[TicTacToeInfra](https://github.com/joheee/TicTacToeInfra)** (Terraform) | Every AWS resource: ECR repo, EC2 instance with SSM, networking and security group, IAM instance role, GitHub OIDC provider and deploy role, SSM Parameter Store entries | The infrastructure changes |
| **[TicTacToeVpsMigration](https://github.com/joheee/TicTacToeVpsMigration)** (Terraform, project 2) | Every DigitalOcean resource: Droplet, VPC, Cloud Firewall, reserved IP, Spaces backup bucket; cloud-init hardening (deploy user, key-only SSH, Docker); cutover and rollback runbooks | The VPS infrastructure or the cutover plan changes |

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

The DigitalOcean pipeline reads TicTacToeVpsMigration's outputs the same way,
as repository variables:

| Variable | Terraform output (TicTacToeVpsMigration) | Used for |
|---|---|---|
| `DO_DROPLET_IP` | `droplet_ipv4` | Reference only (DNS points here) |
| `DO_TAILSCALE_HOST` | `tailscale_hostname` | SSH target (now the reserved IP; Tailscale is no longer used, name kept for the contract) |
| `DO_DEPLOY_USER` | `deploy_user` | SSH user for deploys and backups |
| `DO_APP_URL` | `app_url` | Public smoke test |
| `DO_BACKUP_BUCKET` | `backup_bucket` | Where nightly `pg_dump` files go |
| `DO_SPACES_ENDPOINT` | `spaces_endpoint` | S3-compatible endpoint for that bucket |

Secrets for the DigitalOcean path live in a `digitalocean` GitHub Environment,
not in the repository: the deploy SSH key (`DO_SSH_PRIVATE_KEY`, plus
`DO_SSH_KNOWN_HOSTS`), the app's `.env` values (`POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB`, `SITE_ADDRESS`) and the Spaces keys for
backups. DigitalOcean has no OIDC, so these are the one place stored
credentials are allowed.

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
   After the freeze, at the owner's request: UI polish, the portfolio brand as the
   logo, show/hide password and a confirm-password field on register, and login
   hardening (rate limits, no username timing leak, password length cap). Still no
   new game features.
2. **Everything in Docker Compose.** `docker compose up` runs the Next.js app and
   Postgres locally and on EC2. Same compose file in both places; only env vars
   and the image tag change.
3. **CI on pull requests.** Lint, type-check, test, `npm audit`, a secret scan and
   a `docker build` plus image scan on every PR. Nothing is deployed from a PR.
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
   The failed GitHub Actions run (smoke test red, previous image redeployed) is
   the evidence. No screen recording (dropped as a goal on 30 Oct 2026).
9. **Client-style README.** Architecture diagram, setup steps, runbook (deploy,
   manual rollback, rotate secrets), monthly cost estimate, and a link to the
   rolled-back workflow run.
10. **HTTPS.** A Caddy container in Compose (EC2 only) terminates TLS for
    `tictactoe.johe.my.id` with an automatic Let's Encrypt certificate, redirects
    HTTP to HTTPS, and adds security headers. The smoke test runs against the
    HTTPS URL.
11. **Supply-chain checks.** Third-party actions pinned to commit SHAs, Dependabot,
    `npm audit`, a gitleaks scan of the history and a Trivy scan of the image, all
    in `ci-aws.yml` with no AWS access.

### DigitalOcean target (project 2)

12. **One registry per provider.** Each target builds and pushes its own image
    and never touches the other's registry: `deploy-aws.yml` pushes only to
    Amazon ECR, `deploy-do.yml` pushes only to GitHub Container Registry. Both
    tag the image `<git SHA>` and build it from the same Dockerfile and
    `APP_VERSION` as CI. DigitalOcean is `linux/amd64` only (no ARM Droplets).
    The GHCR package is public, so the Droplet pulls without registry
    credentials; nothing secret is in the image. Removing the AWS path later
    removes ECR with it and leaves the DigitalOcean path untouched.
13. **Deploy to the Droplet over SSH.** `deploy-do.yml` SSHes to
    `DO_TAILSCALE_HOST` (the reserved IP) as `DO_DEPLOY_USER` with a pinned
    host key (key-only public SSH, decided in TicTacToeVpsMigration), copies
    `docker-compose.yml`, `Caddyfile` and `deploy/remote/`, writes `.env` from
    the `digitalocean` Environment secrets (mode 600, never printed), pulls the
    GHCR tag, runs migrations and restarts. No AWS calls.
14. **Same smoke test and rollback.** `deploy/smoke-test.sh` against
    `DO_APP_URL`; on failure redeploy `last_good_tag` on the Droplet and fail
    the run. The `deploy/remote/` scripts get an image-source and env-source
    switch so one copy serves both EC2 (ECR + Parameter Store) and the Droplet
    (GHCR + `.env` from the workflow). One logged `break_health` rollback on the
    Droplet is the proof, run on the rehearsal subdomain.
15. **Cloudflare in front.** Caddy trusts Cloudflare's IP ranges
    (`trusted_proxies`) so the app's per-IP login rate limit sees the real
    client address, and serves a certificate that works with Cloudflare Full
    (strict).
16. **Nightly backup with a tested restore.** `backup-do.yml` on a schedule
    SSHes in and runs `deploy/remote/backup.sh`, which streams
    `pg_dump` (custom format, compressed) to `DO_BACKUP_BUCKET`. The bucket's
    lifecycle rule (project 2) keeps 7 days. One restore into a throwaway
    container with row counts checked is logged in the README.
17. **Uptime check.** A free external monitor (Uptime Kuma on another host or
    a hosted free tier) on `/api/health` that alerts by email or Telegram.
18. **Cutover switch.** Until cutover, `deploy-do.yml` runs only by hand
    (`workflow_dispatch`), so production stays on EC2 and only one database
    takes writes. On cutover day it becomes the `workflow_run` deploy after
    CI, `deploy-aws.yml` is disabled, and `APP_URL` points at the Droplet. After
    TicTacToeInfra is destroyed, the AWS workflow, ECR push and AWS variables
    are removed and the README's diagram, setup and cost sections switch to
    DigitalOcean (the AWS version stays in git history and in project 2's
    "before" picture).

## Out of scope

- Kubernetes, ECS (those are projects 1 and 7).
- Any Terraform or AWS or DigitalOcean resource creation in this repo. That
  lives in TicTacToeInfra and TicTacToeVpsMigration; this repo only reads
  their outputs.
- The cutover itself (DNS flip, final `pg_dump` from EC2 and restore, downtime
  measurement). That runbook lives in TicTacToeVpsMigration.
- More UI work. The one polish pass is done (31 Oct 2026); the UI is frozen again.
- More game features: game history page, replays, move-by-move storage,
  multiplayer. The app is done; spend the remaining time on the pipeline.
- Managed RDS. Postgres runs in Compose with a named volume, so the demo stays
  cheap; the README mentions RDS as the production upgrade.

## Status (checked 4 Nov 2026)

| # | Objective | State |
|---|---|---|
| 1 | Sample app | Done. Auth, game, leaderboard, `/api/health`, migrations `0000`–`0003`, UI polish, login hardening. Next.js 16. |
| 2 | Docker Compose | Done, locally and on EC2 (db → migrate → app, plus the `proxy` profile on EC2). |
| 3 | CI on pull requests | Done. `ci-aws.yml` has three parallel jobs: lint, type-check, test and `npm audit`; gitleaks; Docker build and Trivy scan. Green on `main`. |
| 4 | Build and push to ECR | Done and run against AWS. `deploy-aws.yml` pushes `<git SHA>` after CI passes on `main`. |
| 5 | Deploy to EC2 via SSM + OIDC | Done and run against AWS. Live at https://tictactoe.johe.my.id. |
| 6 | Smoke test | Done. Runs after every deploy against the public HTTPS URL. |
| 7 | Automatic rollback | Done and proven (see 8). |
| 8 | Proven bad deploy | Done. Demonstrated for real on 30 Oct 2026 with `break_health` (the smoke test failed, `last_good_tag` was redeployed, the run ended red). |
| 9 | Client-style README | Done. Architecture diagram, local run, CI, supply chain, deploy, HTTPS, one-time setup, runbook, cost estimate and the link to the rolled-back run (#41087349024). |
| 10 | HTTPS | Done. Caddy, Let's Encrypt, HSTS and security headers. |
| 11 | Supply-chain checks | Done. Pinned actions, Dependabot, audit, gitleaks, Trivy. |

| 12–14 | DigitalOcean image, deploy, rollback | Written, not run yet: `ci-do.yml`, `deploy-do.yml`, `deploy/ssh-run.sh`, and the `ENV_SOURCE`/`REGISTRY` switches in `deploy/remote/deploy.sh`. Waits for the Droplet and the variables and secrets. Registries are separate: `deploy-aws.yml` pushes to ECR only, `deploy-do.yml` to GHCR only. |
| 15 | Cloudflare in front | Caddy `trusted_proxies` and verified `X-Forwarded-For` written and tested locally with a trusted and an untrusted peer. Not yet seen behind real Cloudflare. |
| 16 | Nightly backup, tested restore | `backup-do.yml`, `deploy/remote/backup.sh` and `counts.sh` written; dump and restore checked locally in Postgres 18. Waits for the Droplet, the bucket and the Spaces keys; the README restore log is still empty. |
| 17–18 | Uptime check, cutover | Not started. |

Paused on 4 Nov 2026: DigitalOcean is unavailable (payment card issue), so nothing
DigitalOcean-side has run yet. Everything in rows 12–16 is written and uncommitted
or untested against a real Droplet. Next steps that need no DigitalOcean access:

1. Rehearse `deploy/ssh-run.sh` locally against an `sshd` container with the Docker
   socket mounted (deploy, `mark-good`, a broken tag for rollback, `backup`, `counts`,
   and check `.env` is never printed). This needs an `APP_DIR` override, default `/opt/app`.
2. Re-test the EC2 path of `deploy.sh` (`ENV_SOURCE=ssm`, `REGISTRY=ecr`) with a
   stubbed `aws`; the `Caddyfile` and `deploy.sh` changes reach production on the next push.
3. Add `actionlint` and `shellcheck` to CI.
4. Optional: a scheduled uptime check on `/api/health` (objective 17) as a stopgap.
5. Commit the pending work (nothing from the last two sessions is committed).

Open items:

- Parameter Store still holds a `CHANGE_ME` placeholder (the deploy log warns about
  it). Replace it; if it is `POSTGRES_PASSWORD`, run `ALTER USER` in Postgres first
  (README, "Rotate the DB password").
- Dependabot PRs waiting: `typescript` 7 (fails CI), `vitest` 5, `bcryptjs`, the
  actions group, and the Node 25 base image (close it: the image stays on Node 22
  LTS to match CI).
- Requests for TicTacToeInfra (Elastic IP, IMDSv2 and ECR scan on push are already
  there): EBS snapshots or a `pg_dump` backup, and a budget alert.
- The Upwork portfolio entry.

## Plan (1–2 days)

| When | Work |
|---|---|
| Day 1 morning ✓ | Next.js app: register/login/logout, Postgres schema + migrations, `/api/health`, Dockerfile (multi-stage, standalone output), `docker-compose.yml`. Runs locally. |
| Day 1 afternoon ✓ | TicTacToeInfra applied (see that repo's GOALS.md); its outputs copied into this repo's GitHub Actions variables. PR workflow ✓ and build-push-deploy workflow working end to end ✓. |
| Day 2 morning ✓ | Smoke test, automatic rollback, the "bad deploy" switch, rollback tested for real. Plus HTTPS (Caddy) and the supply-chain checks. |
| Day 2 afternoon | README handover, architecture diagram, cost estimate, Upwork portfolio entry. |
| Project 2, day 2 | GHCR push, `deploy-do.yml` with smoke test and rollback, Caddy `trusted_proxies`, `backup-do.yml` with a tested restore, uptime check. Rehearsal on the `vps.` subdomain. |
| Project 2, day 3 | Cutover switch (objective 18), then remove the AWS path after TicTacToeInfra is destroyed. |

## Tools and software

GitHub Actions · Docker · Docker Compose · Amazon ECR · Amazon EC2 ·
GitHub Container Registry · DigitalOcean Droplet · Cloudflare ·
AWS SSM (Run Command) · AWS IAM OIDC · Next.js 16 (App Router, TypeScript) ·
PostgreSQL · Caddy (HTTPS) · Dependabot · gitleaks · Trivy · curl smoke tests ·
draw.io for the diagram

App-level choices (made): Drizzle for the schema and migrations, bcryptjs for
password hashing, httpOnly session cookies for auth.

## Definition of done

- [x] `docker compose up` runs the app and Postgres locally; register and login work.
- [x] PR workflow runs lint, tests and a Docker build.
- [x] Merge to `main` builds, pushes to ECR and deploys to EC2 via SSM using OIDC.
- [x] Every AWS value the workflows use comes from a GitHub Actions variable
      that matches a TicTacToeInfra output; nothing AWS is created from here.
- [x] Smoke test runs after every deploy.
- [x] A broken deploy rolls itself back to the previous image with no manual step.
- [x] No AWS keys, DB passwords or session secrets committed; secrets live in
      GitHub Actions secrets and SSM Parameter Store. (gitleaks finds nothing in the
      history. The `CHANGE_ME` placeholder in Parameter Store is still to be replaced.)
- [x] The site is served over HTTPS with security headers.
- [x] CI scans dependencies, the git history and the image; actions are pinned.
- [x] README has the diagram, runbook, rollback steps, cost estimate and a link to the rolled-back run.

DigitalOcean target (project 2):

- [ ] `deploy-do.yml` pushes the SHA-tagged image to GHCR only, and `deploy-aws.yml` to ECR only; neither workflow uses the other's registry.
- [ ] `deploy-do.yml` deploys to the Droplet over SSH (pinned host key) with no AWS access; `.env` comes from the `digitalocean` Environment and is never printed.
- [ ] Every DigitalOcean value comes from a variable that matches a TicTacToeVpsMigration output; nothing DigitalOcean is created from here.
- [ ] A broken deploy on the Droplet rolls itself back (one logged run).
- [ ] Caddy trusts Cloudflare's ranges; the login rate limit sees real client IPs.
- [ ] Nightly `pg_dump` lands in the backup bucket and one restore has been tested.
- [ ] An uptime check alerts when `/api/health` fails.
- [ ] After cutover, merges deploy only to the Droplet; after AWS is destroyed, the AWS path is removed and the README describes the DigitalOcean setup.
