# PredictLM Security

## Production access

Production is fail-closed. Configure these server-only variables before deploying this security branch:

- `PREDICTLM_ACCESS_TOKEN`: deployment access credential. Do not expose it through `NEXT_PUBLIC_*`.
- `PREDICTLM_SESSION_SECRET`: independent high-entropy HMAC secret for the HttpOnly session cookie.
- `PREDICTLM_RATE_LIMIT_SECRET`: independent secret used to hash rate-limit identities.
- `PREDICT_SUPABASE_URL` and `PREDICT_SUPABASE_SERVICE_ROLE_KEY`: recommended for the distributed serverless rate limiter.

Browser users enter the access credential once at `/access`; the server exchanges it for a signed, HttpOnly, SameSite=Strict session. API clients can use `Authorization: Bearer <PREDICTLM_ACCESS_TOKEN>`.

Do not merge/deploy the access middleware before the production access token is configured, otherwise production intentionally returns a locked state.

## Database migrations

Apply the following migrations together with the deployment that contains their matching application code:

1. `20260929_api_rate_limit.sql` creates the distributed rate-limit table and service-role-only RPC.
2. `20260929_workspace_secret_proof_rls.sql` changes workspace RLS so the request carries the ephemeral workspace proof while PostgreSQL hashes it before comparison. This prevents a stored `workspace_secret_hash` value from being reusable directly as the header credential.

The second migration must not be applied before the updated `/api/feedback` route is deployed, because the old route sends the stored hash rather than the raw proof.

## External actions

`/api/social/publish` requires both authenticated access and `confirmPublish: true`. Background learning workflows no longer push generated changes directly to `main`; they update bot-owned branches and open/update pull requests for explicit review.

## URL fetching

Server-side public URL inspection uses DNS-aware IP validation and revalidates every redirect. Private, loopback, link-local and internal hostnames are rejected. This materially reduces SSRF exposure, though infrastructure-level egress controls remain the strongest defense against DNS-rebinding and network metadata attacks.

## CI gates

CI runs source typecheck, tests, production build and export smoke. Dependency security refreshes are validated with `npm audit --omit=dev --audit-level=high` before they are accepted.
