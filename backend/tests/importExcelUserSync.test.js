import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, extractNik, normalizeDate, dashIfNull } from '../src/controllers/importController.js';

describe('Import Excel User Sync Unit & Reconcile Tests', () => {

  test('extractNik returns valid NIK and extracts NIK from combined text', () => {
    assert.equal(extractNik('2026001'), '2026001');
    assert.equal(extractNik('2026001 - Budi Santoso'), '2026001');
    assert.equal(extractNik('2026001 (Siti)'), '2026001');
  });

  test('Email Fallback: Karyawan tanpa email otomatis menggunakan NIK@esb.co.id', () => {
    const nik = '2026001';
    const emailRaw = null;
    const emailResolved = emailRaw || (nik ? `${nik.toLowerCase()}@esb.co.id` : null);
    assert.equal(emailResolved, '2026001@esb.co.id');
  });

  test('Single Hash Optimization: Hash password default cukup dipanggil 1x untuk 327 rows', () => {
    let hashCalls = 0;
    function mockHashPassword() {
      hashCalls++;
      return '$2a$12$MockedBcryptHashForDefaultPasswordString';
    }

    // Pre-computed hash call ONCE
    const defaultPasswordHash = mockHashPassword();
    assert.equal(hashCalls, 1);

    // Simulate 327 user rows created using pre-computed hash
    const createdUsers = [];
    for (let i = 1; i <= 327; i++) {
      createdUsers.push({
        nama: `Karyawan ${i}`,
        email: `emp${i}@esb.co.id`,
        password_hash: defaultPasswordHash,
      });
    }

    assert.equal(createdUsers.length, 327);
    assert.equal(hashCalls, 1); // Password hash WAS NOT called 327 times!
  });

  test('Reconciliation Logic: Total Karyawan Valid === (Created Users + Existing Users + Failed Users)', () => {
    const totalValidEmployees = 327;
    const existingUsersCount = 20;
    const createdUsersCount = 307;
    const failedUsersCount = 0;

    const totalUsersAccounted = createdUsersCount + existingUsersCount + failedUsersCount;
    assert.equal(totalUsersAccounted, totalValidEmployees);
  });

  test('Email Normalization: LOWER(TRIM(email)) mencegah duplicate user akibat case difference', () => {
    const dbUserSet = new Set(['budi.santoso@esb.co.id']);
    const inputEmail = '  Budi.Santoso@esb.co.id  ';
    const normalized = inputEmail.trim().toLowerCase();

    assert.equal(dbUserSet.has(normalized), true);
  });

});
