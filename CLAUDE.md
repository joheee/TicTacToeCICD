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

## Working rules

- Never commit secrets: no AWS keys, DB passwords or session secrets. Use
  `.env.example` with placeholders, GitHub Actions secrets and SSM Parameter Store.
- Keep the app small. Don't add features that aren't in `GOALS.md`.
- Image tags are the git SHA. Never deploy `latest`.
- Every workflow change must keep the rollback path working.
- Update the README runbook whenever deploy or rollback steps change.
- Tick the boxes in the GOALS.md "Definition of done" as items are finished.
