import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { normalizeLocation } from '../src/utils/locationNormalizer.js'

const employeesViewUrl = new URL('../src/views/EmployeesView.vue', import.meta.url)

describe('EmployeesView Frontend Logic & Permission Tests', () => {
  test('harus memformat lokasi kerja Karyawan dengan benar', () => {
    assert.equal(normalizeLocation('JKT'), 'Jakarta')
    assert.equal(normalizeLocation('GS'), 'Gading Serpong')
    assert.equal(normalizeLocation('PL'), 'Pluit')
    assert.equal(normalizeLocation('BKS'), 'Bekasi')
  })

  test('EmployeesView enforces karyawan write permission strictly on CRUD buttons, modals, and mutations', async () => {
    const source = await readFile(employeesViewUrl, 'utf8')

    // Must evaluate hasWritePermission('karyawan') strictly without cross-module leakage
    assert.match(
      source,
      /const canWriteKaryawan\s*=\s*computed\(\s*\(\)\s*=>\s*hasWritePermission\('karyawan'\)\s*\)/,
    )
    assert.doesNotMatch(
      source,
      /hasWritePermission\('karyawan'\)\s*\|\|\s*hasWritePermission\('assets'\)/,
    )
    assert.doesNotMatch(
      source,
      /hasWritePermission\('karyawan'\)\s*\|\|\s*hasWritePermission\('users'\)/,
    )

    // Mutation handlers must guard with canWriteKaryawan
    assert.match(source, /function openAdd\(\)\s*\{[\s\S]*?if \(!canWriteKaryawan\.value\) return/)
    assert.match(
      source,
      /function openEdit\(emp\)\s*\{[\s\S]*?if \(!canWriteKaryawan\.value\) return/,
    )
    assert.match(
      source,
      /function openDelete\(emp\)\s*\{[\s\S]*?if \(!canWriteKaryawan\.value\) return/,
    )
    assert.match(
      source,
      /async function saveEmployee\(\)\s*\{[\s\S]*?if \(!canWriteKaryawan\.value\)/,
    )
    assert.match(
      source,
      /async function deleteEmployee\(\)\s*\{[\s\S]*?if \(!canWriteKaryawan\.value/,
    )

    // Template elements must bind canWriteKaryawan
    assert.match(source, /v-if="canWriteKaryawan"[\s\S]*?Tambah Karyawan/)
    assert.match(source, /v-if="canWriteKaryawan"[\s\S]*?Import/)
    assert.match(source, /v-if="canWriteKaryawan"[\s\S]*?Aksi/)

    // Modal submit and delete buttons must be disabled when !canWriteKaryawan
    assert.match(source, /:disabled="isSubmitting \|\| !canWriteKaryawan"[\s\S]*?Simpan Data/)
    assert.match(
      source,
      /:disabled="isSubmitting \|\| !canWriteKaryawan"[\s\S]*?Ya, Hapus Karyawan/,
    )
  })
})
