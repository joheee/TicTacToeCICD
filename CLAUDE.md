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

## App state

The app is feature-complete for this project: auth, a tic-tac-toe game against a
flawed minimax bot, per-user scores, a Top 10 leaderboard, stored finished games
(`games` table) and a saved last board (`users.current_board`). The remaining
work is the pipeline, so don't add app features.

Code layout: game rules and bot in `src/lib/game.ts` (unit-tested), server
actions in `src/lib/play.ts` and `src/lib/actions.ts`, schema in
`src/lib/schema.ts`, migrations in `migrations/`.

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
