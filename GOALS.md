# Project goals: One-day CI/CD for an app on EC2

This repo is portfolio project #4 for my Upwork DevOps profile. The point of the
project is the **pipeline**, not the app. A client should be able to look at this
repo and think "this person can set up CI/CD for my EC2 app in 48 hours".

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
2. **Everything in Docker Compose.** `docker compose up` runs the Next.js app and
   Postgres locally and on EC2. Same compose file in both places; only env vars
   and the image tag change.
3. **CI on pull requests.** Lint, type-check, test and `docker build` on every PR.
   Nothing is deployed from a PR.
4. **Build and push on merge to `main`.** Build the image once, tag it with the
   git SHA, push to Amazon ECR.
5. **Deploy to EC2 without SSH keys.** GitHub Actions authenticates to AWS with
   **OIDC** (no stored access keys) and deploys with **AWS SSM Run Command**
   (no port 22 open). The instance pulls the new tag and restarts the app
   container. Database migrations run before the new app container starts.
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

- Kubernetes, ECS, Terraform-heavy infrastructure (those are projects 1 and 7).
- Fancy UI. Plain, clean pages are fine.
- Managed RDS. Postgres runs in Compose with a named volume, so the demo stays
  cheap; the README mentions RDS as the production upgrade.

## Plan (1–2 days)

| When | Work |
|---|---|
| Day 1 morning | Next.js app: register/login/logout, Postgres schema + migrations, `/api/health`, Dockerfile (multi-stage, standalone output), `docker-compose.yml`. Runs locally. |
| Day 1 afternoon | AWS setup: ECR repo, EC2 instance with SSM agent and Docker, IAM role for the instance, GitHub OIDC role. PR workflow and build-push-deploy workflow working end to end. |
| Day 2 morning | Smoke test, automatic rollback, the "bad deploy" switch, rollback tested for real. |
| Day 2 afternoon | README handover, architecture diagram, cost estimate, screen recording, Upwork portfolio entry. |

## Tools and software

GitHub Actions · Docker · Docker Compose · Amazon ECR · Amazon EC2 ·
AWS SSM (Run Command) · AWS IAM OIDC · Next.js (App Router, TypeScript) ·
PostgreSQL · curl smoke tests · draw.io for the diagram

App-level choices (open to change): Prisma or Drizzle for the schema and
migrations, bcrypt/argon2 for password hashing, session cookies (httpOnly) or
Auth.js credentials provider for auth.

## Definition of done

- [ ] `docker compose up` runs the app and Postgres locally; register and login work.
- [ ] PR workflow runs lint, tests and a Docker build.
- [ ] Merge to `main` builds, pushes to ECR and deploys to EC2 via SSM using OIDC.
- [ ] Smoke test runs after every deploy.
- [ ] A broken deploy rolls itself back to the previous image with no manual step.
- [ ] No AWS keys, DB passwords or session secrets committed; secrets live in
      GitHub Actions secrets and SSM Parameter Store.
- [ ] README has the diagram, runbook, rollback steps, cost estimate and recording link.
