# aimhi-analyzer-sandbox
AIMHI’s Analyzer Sandbox is a fast, zero‑auth demo that lets users test synthetic multifamily deal assumptions and instantly see NOI, DSCR, IRR, equity multiple, and sensitivity results using a deterministic client‑side engine deployed on Google Cloud and served through Cloudflare.

## Copilot code review model requirement

The `code_review` automation in this environment depends on the Copilot model registry exposing `capi-prod-claude-sonnet-4.6` in the `/models` endpoint.
If this model is not present, code review invocations fail before analyzing repository changes.
