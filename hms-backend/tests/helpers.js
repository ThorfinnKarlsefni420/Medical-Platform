'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

let passed = 0;
let failed = 0;
const failures = [];

function mintToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

async function req(method, path, { body, token } = {}, base) {
  const url     = new URL(path, base);
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

function getStats() {
  return { passed, failed, failures };
}

function resetStats() {
  passed = 0;
  failed = 0;
  failures.length = 0;
}

module.exports = { mintToken, req, assert, getStats, resetStats };
