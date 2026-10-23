# AIMaster AI generation API handoff

## Implemented on 2026-10-05

`POST /api/threads-content-ops/generate` is the first replacement for the imported desktop application's local Codex CLI runner.

- It requires `Authorization: Bearer <personal access token>`.
- It verifies both the token and current `threads-content-ops` entitlement with `verifyPersonalAccessTokenWithProgramAccess()`.
- It resolves only the authenticated member's `openai` key from the shared `user_api_keys` table. There is no global fallback key, and the desktop app must never receive that key.
- It uses the OpenAI Responses API (`gpt-4o-mini`) with strict Structured Outputs. The returned object matches the existing desktop `AgentResult` contract: decision, reason, vetoes, optional content/topic/angle/image fields, and source URLs.
- It does not enable web search. A later, separately reviewed feature may add source retrieval with clear UI disclosure and its own cost/risk controls.
- It declares `force-dynamic` and `force-no-store`; caller prompts and API keys are neither logged nor returned.

## Desktop integration next step

Create a local `AIMasterAgentRunner` that stores only the program personal access token in the existing OS-backed credential store, sends the existing `role` and `prompt` to this endpoint, and validates the returned `result`. Replace the imports and startup status UI that currently require `CodexRunner` and `CodexRateLimitClient` only after that adapter has automated tests. Do not modify the existing `threads*` programs while doing this work.

## Verification

The root `npm.cmd run build` completed after this route was added. No paid API request was made: an end-to-end generation test must use a test member who has explicitly registered their own OpenAI API key and has access to this private program.
