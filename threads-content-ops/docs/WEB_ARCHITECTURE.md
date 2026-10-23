# Web-first architecture (v1.05)

The desktop/Electron source is reference-only and is not a product delivery path. `threads-content-ops` runs inside AIMaster web pages.

- Shared AIMaster Supabase is used; it is not a separate database per customer.
- Every member-owned row has `user_id`; `tco_threads_accounts` and `tco_posts` have owner-only RLS policies.
- Each member registers only their own OpenAI key and `threads_app_id` / `threads_app_secret` in shared `user_api_keys`.
- OAuth callback, content generation, post creation, publication and scheduling must each verify program entitlement.
- The browser never receives Threads access tokens or another member's content.
- Scheduling starts disabled and each execution rechecks entitlement and token validity.

Implementation order: web settings for member API credentials and OAuth, account connection callback, draft CRUD, explicit manual publish, then opt-in scheduling.
