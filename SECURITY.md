# Security Report — Busia HMS

## Authentication
- Passwords hashed with bcrypt (12 rounds)
- Timing-safe login: dummy hash compared when user doesn't exist — prevents user enumeration via response time
- JWT tokens with expiry (default 7 days)
- Every protected request checks `is_active` in DB — deactivated accounts are locked out immediately, not after token expiry

## Access Control
- Role-based access control (RBAC) on all protected routes — each role sees only what it is permitted to
- Staff accounts can only be created by an authenticated admin
- Patient self-registration is open; staff registration requires admin Bearer token

## Brute-Force & Abuse Protection
- Login endpoint rate-limited to 20 attempts per IP per 15 minutes — prevents password brute-force
- Request body capped at 50 KB — prevents memory exhaustion via oversized payloads

## HTTP Security Headers (Helmet)
- `X-Frame-Options: SAMEORIGIN` — blocks clickjacking
- `X-Content-Type-Options: nosniff` — blocks MIME-type sniffing
- `Content-Security-Policy` — restricts resource loading origins
- `Strict-Transport-Security` — enforces HTTPS on repeat visits
- `Referrer-Policy` — limits referrer info sent to third parties

## Network
- CORS restricted to `FRONTEND_URL` in production — no cross-origin requests from unknown domains
- Credentials flag enabled only for the known frontend origin

## Staff Invite System
- Invite tokens generated with `crypto.randomBytes(32)` — cryptographically secure
- Tokens expire after 48 hours — limits window of abuse if intercepted
