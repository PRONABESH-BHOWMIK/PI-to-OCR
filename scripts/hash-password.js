#!/usr/bin/env node
// scripts/hash-password.js
// Produce the ADMIN_PASSWORD_HASH value for the admin panel:
//
//   node scripts/hash-password.js "your-password"
//
// Output format: scrypt$<saltHex>$<hashHex>
// The plain password is never written to disk.
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js "your-password"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
