/**
 * Integration test suite for Busia HMS backend.
 * Tests all security and data-integrity features implemented so far.
 * Runs against the live server and real DB; cleans up after itself.
 *
 * Usage:  node test-integration.js
 */

require('dotenv').config();
const http  = require('http');
const jwt   = require('jsonwebtoken');
const { Pool } = require('pg');

const BASE   = 'http://localhost:3001';   // dedicated test port
const SECRET = process.env.JWT_SECRET;
const pool   = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ── helpers ────────────────────────────────────────────────────────────────

function mintToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

async function req(method, path, { body, token } = {}) {
  const url     = new URL(path, BASE);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, headers: res.headers, json };
}

// ── test runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    failures.push(`${name}${detail ? ': ' + detail : ''}`);
  }
}

// ── server bootstrap ───────────────────────────────────────────────────────

let server;

function startServer() {
  return new Promise((resolve) => {
    process.env.PORT = '3001';
    const app = require('./server');       // server.js calls app.listen internally
    // server.js does its own listen; we just wait for it to be ready
    setTimeout(resolve, 800);
  });
}

// ── test groups ────────────────────────────────────────────────────────────

async function testHelmetHeaders() {
  console.log('\n[1] HTTP Security Headers (Helmet)');
  const { headers } = await req('GET', '/health');
  assert('X-Content-Type-Options: nosniff',    headers.get('x-content-type-options') === 'nosniff');
  assert('X-Frame-Options present',            !!headers.get('x-frame-options'));
  assert('X-DNS-Prefetch-Control present',     !!headers.get('x-dns-prefetch-control'));
  assert('Referrer-Policy present',            !!headers.get('referrer-policy'));
  assert('X-Permitted-Cross-Domain-Policies',  !!headers.get('x-permitted-cross-domain-policies'));
}

async function testBodySizeLimit() {
  console.log('\n[2] Request Body Size Limit (50 KB)');
  const bigBody = { email: 'x@y.com', password: 'a'.repeat(60_000) };
  const { status } = await req('POST', '/api/auth/login', { body: bigBody });
  assert('60 KB body rejected with 413', status === 413, `got ${status}`);
}

async function testAuthMiddleware() {
  console.log('\n[3] Auth Middleware');

  const { status: s1, json: j1 } = await req('GET', '/api/patients');
  assert('No token → 401', s1 === 401, `got ${s1}`);
  assert('No token message correct', j1?.message === 'No token provided', `got "${j1?.message}"`);

  const { status: s2, json: j2 } = await req('GET', '/api/patients', { token: 'not.a.valid.token' });
  assert('Bad token → 401', s2 === 401, `got ${s2}`);
  assert('Bad token message correct', j2?.message === 'Invalid token', `got "${j2?.message}"`);

  // Expired token
  const expiredToken = jwt.sign(
    { userId: 1, email: 'admin@hms.com', role: 'admin', patientId: null },
    SECRET,
    { expiresIn: '-1s' }
  );
  const { status: s3, json: j3 } = await req('GET', '/api/patients', { token: expiredToken });
  assert('Expired token → 401', s3 === 401, `got ${s3}`);
  assert('Expired token message correct', j3?.message === 'Token expired', `got "${j3?.message}"`);
}

async function testIsActiveCheck() {
  console.log('\n[4] is_active Enforcement');

  // Insert a temp user directly so we control is_active
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash('TestPass123!', 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'receptionist') RETURNING user_id`,
    ['__test_inactive__@hms.com', hashed]
  );
  const userId = rows[0].user_id;

  // Mint a valid JWT for this user
  const token = mintToken({ userId, email: '__test_inactive__@hms.com', role: 'receptionist', patientId: null });

  // Should work while active
  const { status: s1 } = await req('GET', '/api/patients', { token });
  assert('Active user → 200', s1 === 200, `got ${s1}`);

  // Deactivate the account
  await pool.query('UPDATE users SET is_active = FALSE WHERE user_id = $1', [userId]);

  // Same token should now be rejected immediately
  const { status: s2, json: j2 } = await req('GET', '/api/patients', { token });
  assert('Deactivated user → 401 immediately (not after token expiry)', s2 === 401, `got ${s2}`);
  assert('Correct inactive message', j2?.message === 'Account is inactive', `got "${j2?.message}"`);

  // Cleanup
  await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
}

async function testPatientOwnership() {
  console.log('\n[5] Patient Ownership Enforcement');

  // patient_id=2 (user_id=6) trying to access records belonging to patient_id=4
  const tokenP2 = mintToken({ userId: 6, email: 'BusiaPatientA@gmail.com', role: 'patient', patientId: 2 });
  // patient_id=4 (user_id=29) — the real owner
  const tokenP4 = mintToken({ userId: 29, email: 'Jamesochieng@gmail.com', role: 'patient', patientId: 4 });

  // Medical record #5 belongs to patient_id=4
  const { status: mrWrong } = await req('GET', '/api/medical-records/5', { token: tokenP2 });
  assert('Wrong patient → 403 on medical record',  mrWrong === 403, `got ${mrWrong}`);

  const { status: mrOwn } = await req('GET', '/api/medical-records/5', { token: tokenP4 });
  assert('Correct patient → 200 on own medical record', mrOwn === 200, `got ${mrOwn}`);

  // Appointment #2 belongs to patient_id=4
  const { status: apptWrong } = await req('GET', '/api/appointments/2', { token: tokenP2 });
  assert('Wrong patient → 403 on appointment', apptWrong === 403, `got ${apptWrong}`);

  const { status: apptOwn } = await req('GET', '/api/appointments/2', { token: tokenP4 });
  assert('Correct patient → 200 on own appointment', apptOwn === 200, `got ${apptOwn}`);

  // Lab result #5 belongs to patient_id=4
  const { status: lrWrong } = await req('GET', '/api/lab-results/5', { token: tokenP2 });
  assert('Wrong patient → 403 on lab result', lrWrong === 403, `got ${lrWrong}`);

  const { status: lrOwn } = await req('GET', '/api/lab-results/5', { token: tokenP4 });
  assert('Correct patient → 200 on own lab result', lrOwn === 200, `got ${lrOwn}`);

  // Prescription #7 belongs to patient_id=4
  const { status: prWrong } = await req('GET', '/api/prescriptions/7', { token: tokenP2 });
  assert('Wrong patient → 403 on prescription', prWrong === 403, `got ${prWrong}`);

  const { status: prOwn } = await req('GET', '/api/prescriptions/7', { token: tokenP4 });
  assert('Correct patient → 200 on own prescription', prOwn === 200, `got ${prOwn}`);
}

async function testBedRaceCondition() {
  console.log('\n[6] Bed Race Condition Protection');

  const adminToken = mintToken({ userId: 1, email: 'admin@hms.com', role: 'admin', patientId: null });

  // record_id=5 has no current admission; bed_id=1 is free
  const { status: s1, json: j1 } = await req('POST', '/api/admissions', {
    token: adminToken,
    body:  { record_id: 5, bed_id: 1, status: 'Admitted' },
  });
  assert('First admission to free bed → 201', s1 === 201, `got ${s1}`);

  // Second attempt to same bed should be rejected
  const { status: s2, json: j2 } = await req('POST', '/api/admissions', {
    token: adminToken,
    body:  { record_id: 5, bed_id: 1, status: 'Admitted' },
  });
  assert('Second admission to occupied bed → 409', s2 === 409, `got ${s2}`);
  assert('409 message mentions occupied', /occupied|exist/i.test(j2?.message ?? ''), `got "${j2?.message}"`);

  // Cleanup — delete the admission (also frees the bed)
  if (j1?.admission_id) {
    await req('DELETE', `/api/admissions/${j1.admission_id}`, { token: adminToken });
  } else {
    // fallback: clean via DB
    await pool.query(`DELETE FROM admissions WHERE record_id=5 AND bed_id=1`);
    await pool.query(`UPDATE beds SET is_occupied=FALSE WHERE bed_id=1`);
  }
}

async function testDrugStockLimit() {
  console.log('\n[7] Drug Stock Limit Enforcement');

  // prescription_id=4 is Paracetamol 500mg; drug_id=2 has 800 in stock
  const pharmacistToken = mintToken({ userId: 26, email: 'Oreng@hms.com', role: 'pharmacist', patientId: null });

  const { status, json } = await req('POST', '/api/pharmacy-dispensing', {
    token: pharmacistToken,
    body:  { prescription_id: 4, quantity_dispensed: 9000, status: 'Stock Verified' },
  });
  assert('Dispense over stock → 409', status === 409, `got ${status}`);
  assert('409 mentions available quantity', /available/i.test(json?.message ?? ''), `got "${json?.message}"`);

  // Valid dispense (small quantity) should succeed
  const { status: s2, json: j2 } = await req('POST', '/api/pharmacy-dispensing', {
    token: pharmacistToken,
    body:  { prescription_id: 4, quantity_dispensed: 5, status: 'Stock Verified' },
  });
  assert('Valid dispense → 201', s2 === 201, `got ${s2}`);

  // Cleanup
  if (j2?.dispense_id) {
    const adminToken = mintToken({ userId: 1, role: 'admin', patientId: null });
    await req('DELETE', `/api/pharmacy-dispensing/${j2.dispense_id}`, { token: adminToken });
    // Restore stock
    await pool.query('UPDATE drug_inventory SET quantity_in_stock = quantity_in_stock + 5 WHERE drug_id = 2');
  }
}

async function testRateLimiting() {
  console.log('\n[8] Login Rate Limiting (run last — exhausts IP window)');

  const attempts = [];
  for (let i = 0; i < 21; i++) {
    attempts.push(req('POST', '/api/auth/login', {
      body: { email: `__ratelimit_test_${i}@no.com`, password: 'wrongpassword' },
    }));
  }
  // Run sequentially so rate limiter counts correctly
  const results = [];
  for (const p of attempts) results.push(await p);

  const last = results[results.length - 1];
  assert('21st login attempt → 429', last.status === 429, `got ${last.status}`);
  assert('Rate limit message present', !!last.json?.message, `got "${last.json?.message}"`);
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting HMS integration tests...\n');

  await startServer();

  try {
    await testHelmetHeaders();
    await testBodySizeLimit();
    await testAuthMiddleware();
    await testIsActiveCheck();
    await testPatientOwnership();
    await testBedRaceCondition();
    await testDrugStockLimit();
    await testRateLimiting();   // must be last — exhausts rate limit window
  } finally {
    await pool.end();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailed:');
    failures.forEach((f) => console.log(`  • ${f}`));
  }
  console.log('─'.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
