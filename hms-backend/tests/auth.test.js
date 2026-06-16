'use strict';

/**
 * Auth registration edge-case tests.
 *
 * Covers gaps not in test-integration.js:
 *  - Staff creation without admin token → 401
 *  - Staff creation with non-admin token → 403
 *  - Duplicate email → 409
 *  - Invalid role → 400
 *  - Password too short → 400
 *  - Missing required fields → 400
 */

const { mintToken, req, assert } = require('./helpers');

module.exports = async function testAuth(BASE, adminUserId) {
  console.log('\n[AUTH] Registration Validation & Access Control');

  // ── missing fields ────────────────────────────────────────────────────────
  const { status: s1, json: j1 } = await req('POST', '/api/auth/register', {
    body: { email: 'missing@hms.com', role: 'patient' },
  }, BASE);
  assert('Missing password → 400', s1 === 400, `got ${s1}`);
  assert('Missing password message', /password/i.test(j1?.message ?? ''), `got "${j1?.message}"`);

  // ── password too short ────────────────────────────────────────────────────
  const { status: s2, json: j2 } = await req('POST', '/api/auth/register', {
    body: { email: 'short@hms.com', password: '1234', role: 'patient' },
  }, BASE);
  assert('Short password → 400', s2 === 400, `got ${s2}`);
  assert('Short password message', /8 char/i.test(j2?.message ?? ''), `got "${j2?.message}"`);

  // ── invalid role ──────────────────────────────────────────────────────────
  const { status: s3, json: j3 } = await req('POST', '/api/auth/register', {
    body: { email: 'badrole@hms.com', password: 'ValidPass1', role: 'superuser' },
  }, BASE);
  assert('Invalid role → 400', s3 === 400, `got ${s3}`);
  assert('Invalid role message', /role/i.test(j3?.message ?? ''), `got "${j3?.message}"`);

  // ── staff registration without token ─────────────────────────────────────
  const { status: s4, json: j4 } = await req('POST', '/api/auth/register', {
    body: { email: 'noauth@hms.com', password: 'ValidPass1', role: 'nurse' },
  }, BASE);
  assert('Staff creation without token → 401', s4 === 401, `got ${s4}`);
  assert('Correct no-token message', /admin/i.test(j4?.message ?? ''), `got "${j4?.message}"`);

  // ── staff registration with non-admin token ───────────────────────────────
  const nurseToken = mintToken({ userId: 999, email: 'nurse@hms.com', role: 'nurse', patientId: null });
  const { status: s5, json: j5 } = await req('POST', '/api/auth/register', {
    body:  { email: 'newstaff@hms.com', password: 'ValidPass1', role: 'doctor' },
    token: nurseToken,
  }, BASE);
  assert('Non-admin creating staff → 403', s5 === 403, `got ${s5}`);
  assert('403 message mentions admin', /admin/i.test(j5?.message ?? ''), `got "${j5?.message}"`);

  // ── duplicate email ───────────────────────────────────────────────────────
  // admin@hms.com already exists (created directly in DB)
  const adminToken = mintToken({ userId: adminUserId, email: 'admin@hms.com', role: 'admin', patientId: null });
  const { status: s6 } = await req('POST', '/api/auth/register', {
    body:  { email: 'admin@hms.com', password: 'ValidPass1', role: 'receptionist' },
    token: adminToken,
  }, BASE);
  assert('Duplicate email → 409', s6 === 409, `got ${s6}`);
};
