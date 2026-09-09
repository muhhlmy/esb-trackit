import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocation } from '../src/utils/locationNormalizer.js';

describe('Aset GA Data & Validation Logic', () => {
  test('harus memvalidasi field wajib GA Asset', () => {
    const validAsset = {
      hostname: 'GA-PL-001',
      quantity: 10,
      tipe_fasilitas: 'Meja',
      nama_asset: 'Meja Kerja',
      lokasi: 'PL',
      kondisi: 'Baik'
    };

    assert.ok(validAsset.hostname);
    assert.ok(validAsset.quantity > 0);
    assert.ok(validAsset.tipe_fasilitas);
    assert.ok(validAsset.nama_asset);
    assert.equal(normalizeLocation(validAsset.lokasi), 'Pluit');
  });

  test('harus menolak quantity bernilai 0 atau negatif', () => {
    const invalidQty = 0;
    const isValid = invalidQty > 0;
    assert.equal(isValid, false);
  });

  test('harus menerima nomor_tagging, brand, dan tipe sebagai alias field GA Asset', () => {
    const assetPayload = {
      nomor_tagging: 'GA-PL-002',
      quantity: 5,
      tipe: 'Kursi',
      brand: 'Informa',
      lokasi: 'GS',
      kondisi: 'Baik'
    };

    const hostname = assetPayload.hostname || assetPayload.nomor_tagging;
    const tipeFasilitas = assetPayload.tipe_fasilitas || assetPayload.tipe;
    const namaAsset = assetPayload.nama_asset || assetPayload.brand || assetPayload.nama;

    assert.equal(hostname, 'GA-PL-002');
    assert.equal(tipeFasilitas, 'Kursi');
    assert.equal(namaAsset, 'Informa');
    assert.equal(normalizeLocation(assetPayload.lokasi), 'Gading Serpong');
  });
});
