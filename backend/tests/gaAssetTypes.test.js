import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';
import * as gaAssetController from '../src/controllers/gaAssetController.js';

describe('Tipe Aset GA CRUD & Database Logic', () => {
  let createdTypeId = null;
  const mockUser = { id: 1, nama: 'Super Administrator', role: 'superadmin' };

  test('listGaAssetTypes harus mengembalikan array tipe aset GA dari tabel', async () => {
    let responseData = null;
    const req = { user: mockUser };
    const res = {
      json(data) { responseData = data; }
    };

    await gaAssetController.listGaAssetTypes(req, res);
    assert.ok(Array.isArray(responseData), 'Response harus berupa array');
    assert.ok(responseData.length > 0, 'Harus ada tipe bawaan di database');
    assert.ok(responseData.some((t) => t.nama_tipe === 'Meja'));
  });

  test('addGaAssetType harus menambahkan tipe baru dengan sukses', async () => {
    let statusCode = 200;
    let responseData = null;
    const testName = `TipeTest_${Date.now()}`;
    const req = {
      user: mockUser,
      body: { nama_tipe: testName, deskripsi: 'Deskripsi uji tipe baru' }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; }
    };

    await gaAssetController.addGaAssetType(req, res);
    assert.equal(statusCode, 201);
    assert.ok(responseData?.id);
    assert.equal(responseData.nama_tipe, testName);
    createdTypeId = responseData.id;
  });

  test('addGaAssetType harus menolak nama tipe duplikat (409)', async () => {
    let statusCode = 200;
    let responseData = null;
    const req = {
      user: mockUser,
      body: { nama_tipe: 'Meja' }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; }
    };

    await gaAssetController.addGaAssetType(req, res);
    assert.equal(statusCode, 409);
    assert.match(responseData.error, /sudah terdaftar/i);
  });

  test('updateGaAssetType harus memperbarui nama dan deskripsi tipe', async () => {
    assert.ok(createdTypeId, 'ID tipe yang dibuat harus ada');
    let statusCode = 200;
    let responseData = null;
    const updatedName = `TipeUpdated_${Date.now()}`;
    const req = {
      user: mockUser,
      params: { id: String(createdTypeId) },
      body: { nama_tipe: updatedName, deskripsi: 'Deskripsi terupdate' }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; }
    };

    await gaAssetController.updateGaAssetType(req, res);
    assert.equal(statusCode, 200);
    assert.equal(responseData.nama_tipe, updatedName);
    assert.equal(responseData.deskripsi, 'Deskripsi terupdate');
  });

  test('deleteGaAssetType harus melakukan soft-delete tipe aset GA', async () => {
    assert.ok(createdTypeId, 'ID tipe yang dibuat harus ada');
    let statusCode = 200;
    let responseData = null;
    const req = {
      user: mockUser,
      params: { id: String(createdTypeId) }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; }
    };

    await gaAssetController.deleteGaAssetType(req, res);
    assert.equal(statusCode, 200);
    assert.match(responseData.message, /berhasil dihapus/i);

    // Verifikasi bahwa tipe tersebut sudah tidak muncul di listGaAssetTypes
    let listData = null;
    await gaAssetController.listGaAssetTypes(req, { json(d) { listData = d; } });
    assert.equal(listData.some((t) => t.id === createdTypeId), false);
  });

  after(async () => {
    if (createdTypeId) {
      await pool.query('DELETE FROM tipe_aset_ga WHERE id = $1', [createdTypeId]).catch(() => {});
    }
  });
});
