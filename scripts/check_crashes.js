#!/usr/bin/env node
/**
 * check_crashes.js — Developer crash review tool for Cream & Crust.
 *
 * Run from workspace:
 *   node scripts/check_crashes.js
 *
 * Fetches the 15 most recent unresolved crash reports from Firestore
 * and prints them in a readable format so crashes can be diagnosed
 * and fixed without any third-party dashboard.
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or service account key path
 * set as FIREBASE_SERVICE_ACCOUNT_PATH env var.
 *
 * OR: run as firebase emulator with local credentials.
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// ── Load credentials ─────────────────────────────────────────────────────
function initAdmin() {
  if (getApps().length > 0) return;

  const keyPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '../firebase-service-account.json');

  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    // Fall back to Application Default Credentials (gcloud CLI / CI)
    initializeApp();
  }
}

async function checkCrashes() {
  initAdmin();
  const db = getFirestore();

  console.log('\n🔍 Cream & Crust — Fetching latest crash reports...\n');
  console.log('━'.repeat(60));

  const snap = await db
    .collection('crash_reports')
    .orderBy('timestamp', 'desc')
    .limit(15)
    .get();

  if (snap.empty) {
    console.log('✅ No crash reports found! App is stable.\n');
    return;
  }

  let index = 1;
  snap.forEach((doc) => {
    const d = doc.data();
    const ts = d.timestamp?.toDate?.()?.toISOString() ?? 'unknown time';
    const resolved = d.resolved ? '✅ Resolved' : '🔴 UNRESOLVED';

    console.log(`\n[${index}] ${resolved}`);
    console.log(`    Time     : ${ts}`);
    console.log(`    Type     : ${d.type || 'unknown'}`);
    console.log(`    URL      : ${d.url || '/'}`);
    console.log(`    UID      : ${d.uid || 'anonymous'}`);
    console.log(`    Version  : ${d.appVersion || 'unknown'}`);
    console.log(`    Message  : ${d.message || 'No message'}`);
    if (d.stack) {
      const stackPreview = d.stack.split('\n').slice(0, 5).join('\n              ');
      console.log(`    Stack    :\n              ${stackPreview}`);
    }
    console.log('    ' + '─'.repeat(56));
    index++;
  });

  console.log(`\nTotal crashes shown: ${snap.size}`);
  console.log('Tip: To mark a crash resolved, set `resolved: true` in Firestore.\n');
}

async function checkAuditLogs() {
  const db = getFirestore();
  console.log('\n📋 Recent Audit Log (last 10 actions)...\n');
  console.log('━'.repeat(60));

  const snap = await db
    .collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  if (snap.empty) {
    console.log('No audit logs found.\n');
    return;
  }

  snap.forEach((doc) => {
    const d = doc.data();
    const ts = d.timestamp?.toDate?.()?.toISOString() ?? 'unknown';
    console.log(`  [${ts}] ${d.action} | uid: ${d.uid} | url: ${d.url}`);
    if (d.meta && Object.keys(d.meta).length > 0) {
      console.log(`          meta: ${JSON.stringify(d.meta)}`);
    }
  });
  console.log();
}

checkCrashes()
  .then(checkAuditLogs)
  .catch((err) => {
    console.error('\n❌ Failed to fetch crash reports:', err.message);
    console.error('Make sure firebase-service-account.json exists or FIREBASE_SERVICE_ACCOUNT_PATH is set.\n');
    process.exit(1);
  });
