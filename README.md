# aimhi-analyzer-sandbox

AIMHI’s Analyzer Sandbox is a fast, zero‑auth demo that lets users test synthetic multifamily deal assumptions and instantly see NOI, DSCR, IRR, equity multiple, and sensitivity results using a deterministic client‑side engine deployed on Google Cloud and served through Cloudflare.

## Autonomous branch architecture

This repository is configured for an autonomous three-branch model:

- `main`: production deployment branch (CI + deploy + Cloudflare purge)
- `dev`: active development branch (CI only)
- `sandbox`: experimental branch (no CI/deploy workflows)

### Automation implemented

- `.github/workflows/branch-manager.yml`
  - Ensures `main`, `dev`, and `sandbox` exist (scheduled + manual trigger).
- `.github/workflows/ci.yml`
  - Runs lint/test/typecheck on `main` and `dev` only when corresponding scripts exist.
- `.github/workflows/main-deploy.yml`
  - Runs on `main` pushes, executes CI gates, runs configurable GCE deploy command, then purges Cloudflare cache.
- `.github/workflows/automerge-sandbox-dev.yml`
  - Scheduled autonomous merge from `sandbox` to `dev`.
- `.github/workflows/automerge-dev-main.yml`
  - Automatically merges `dev` into `main` when `dev` CI succeeds.
- `.github/scripts/automerge.sh`
  - Applies deterministic conflict resolution:
    - engine paths prefer incoming branch
    - UI paths prefer target branch
    - synthetic data paths prefer incoming branch
    - experimental data paths prefer target branch
    - fallback keeps `main` stable by preferring target branch on unresolved path categories

### Required repository configuration

Set these repository secrets/variables to activate deploy and purge actions fully:

- Secret: `GCP_SA_KEY`
- Variable: `GCE_DEPLOY_COMMAND`
- Secret: `CLOUDFLARE_API_TOKEN`
- Secret: `CLOUDFLARE_ZONE_ID`
