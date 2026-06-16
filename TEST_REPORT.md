# Integration Test Report — Busia HMS Backend
**Date:** 26 May 2026
**Result: 31 passed, 0 failed**
**Test file:** `hms-backend/test-integration.js`
**Environment:** Node v24.5.0 · PostgreSQL (live DB) · Express 5

---

## Summary

| Group | Tests | Result |
|---|---|---|
| HTTP Security Headers | 5 | All pass |
| Request Body Size Limit | 1 | Pass (+ bug fixed) |
| Auth Middleware | 6 | All pass |
| is_active Enforcement | 3 | All pass |
| Patient Ownership | 8 | All pass |
| Bed Race Condition | 3 | All pass |
| Drug Stock Limit | 3 | All pass |
| Login Rate Limiting | 2 | All pass |
| **Total** | **31** | **31 / 31** |

---

## Test Groups

### 1 — HTTP Security Headers
Verified Helmet injects the correct headers on every response.

| Header | Expected | Result |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | ✓ |
| `X-Frame-Options` | Present | ✓ |
| `X-DNS-Prefetch-Control` | Present | ✓ |
| `Referrer-Policy` | Present | ✓ |
| `X-Permitted-Cross-Domain-Policies` | Present | ✓ |

---

### 2 — Request Body Size Limit
A 60 KB JSON payload was sent to `POST /api/auth/login`.

- Expected `413 Payload Too Large` — received `413` ✓

**Bug found and fixed during testing:** The error handler was not mapping Express's `PayloadTooLargeError` to a `413` — it was falling through to the generic `500`. A type check (`err.type === 'entity.too.large'`) was added to `errorHandler.js` to fix this.

---

### 3 — Auth Middleware
Three token scenarios tested on `GET /api/patients`.

| Scenario | Expected | Result |
|---|---|---|
| No `Authorization` header | `401 "No token provided"` | ✓ |
| Malformed / invalid token | `401 "Invalid token"` | ✓ |
| Expired token (signed with `-1s` TTL) | `401 "Token expired"` | ✓ |

---

### 4 — is_active Enforcement
A test user was inserted into the DB and given a valid JWT. The account was then deactivated via `UPDATE users SET is_active = FALSE`.

| Scenario | Expected | Result |
|---|---|---|
| Active account — valid token | `200` | ✓ |
| Deactivated account — same token | `401 "Account is inactive"` | ✓ |
| Correct message returned | `"Account is inactive"` | ✓ |

The token was identical in both requests; only the DB row changed. Confirms the middleware checks `is_active` on every request rather than trusting the token alone. Test user was deleted after.

---

### 5 — Patient Ownership Enforcement
Patient B (patient_id=2) attempted to access clinical records belonging to Patient A (patient_id=4). Patient A then accessed the same records to confirm legitimate access still works.

| Resource | Wrong patient | Correct patient |
|---|---|---|
| `GET /api/medical-records/5` | `403` ✓ | `200` ✓ |
| `GET /api/appointments/2` | `403` ✓ | `200` ✓ |
| `GET /api/lab-results/5` | `403` ✓ | `200` ✓ |
| `GET /api/prescriptions/7` | `403` ✓ | `200` ✓ |

All four sensitive resources now enforce record-level ownership. Before this fix, any authenticated patient could read any other patient's data by guessing the record ID.

---

### 6 — Bed Race Condition Protection
Two sequential admission requests were made for the same bed (`bed_id=1`, `record_id=5`).

| Request | Expected | Result |
|---|---|---|
| First admission (bed free) | `201 Created` | ✓ |
| Second admission (bed occupied) | `409 Conflict` | ✓ |
| Response message | Mentions "occupied" | ✓ |

The `SELECT ... FOR UPDATE` transaction lock prevents two concurrent requests from both succeeding. The admission and bed state were restored after the test.

---

### 7 — Drug Stock Limit Enforcement
Tested against `prescription_id=4` (Paracetamol 500mg) with `quantity_in_stock = 800`.

| Scenario | Quantity | Expected | Result |
|---|---|---|---|
| Over-dispense | 9,000 | `409` with available qty in message | ✓ |
| Valid dispense | 5 | `201 Created` | ✓ |

Before this fix, dispensing more than available stock was silently accepted and clamped to zero — leaving the system showing 0 stock with no error. The dispense record and stock delta were restored after the test.

---

### 8 — Login Rate Limiting
21 sequential `POST /api/auth/login` requests were made from the same IP with invalid credentials.

| Attempt | Expected | Result |
|---|---|---|
| Attempts 1–20 | `401 Invalid credentials` | ✓ |
| Attempt 21 | `429 Too Many Requests` | ✓ |
| Response message | Retry message present | ✓ |

Window: 20 attempts per 15 minutes per IP. This test was run last to avoid locking out other test logins.

---

## Bug Discovered During Testing

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `middleware/errorHandler.js` | `PayloadTooLargeError` was not handled — returned `500` instead of `413` | Added `if (err.type === 'entity.too.large')` check returning `413` |
