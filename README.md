# SUST 720 — Tri-Vector Biophysical Stress-Test Generator

Static site deployed on Vercel, based on `deep-time-shock-generator.html` from
[nigelgponder-byte/sust720-stress-test-generator](https://github.com/nigelgponder-byte/sust720-stress-test-generator).

The original page called `claude.use("sample")`, which only exists inside Claude artifacts.
Here the page posts to `/api/generate`, a Vercel function that calls the
[OpenCode Zen](https://opencode.ai/docs/zen/) API.

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Required | Default |
| --- | --- | --- |
| `OPENCODE_API_KEY` | yes | — |
| `OPENCODE_MODEL` | no | `big-pickle` (any model on Zen's `/chat/completions` endpoint) |

Redeploy after changing them.
