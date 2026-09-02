import crypto from 'node:crypto';
import { pool, withTransaction } from "../config/database.js";
import { env } from "../config/env.js";
import { hashPassword } from "../security/passwordService.js";
import { normalizeLocation } from "../utils/locationNormalizer.js";

export function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (
    text === "" ||
    text === "-" ||
    text === "--" ||
    text === "---" ||
    text.toLowerCase() === "n/a" ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "undefined" ||
    text.toLowerCase() === "none"
  ) {
    return null;
  }
  return text;
}

/**
 * Konversi null/undefined menjadi placeholder '-' untuk field non-FK yang nullable.
 * Digunakan agar empty cell dan '-' di Excel disimpan sebagai '-' di DB, bukan NULL.
 *
 * @param {*} value
 * @returns {string} '-' jika value null/undefined, atau value asli
 */
export function dashIfNull(value) {
  if (value === null || value === undefined) return '-';
  return value;
}

export function safeTruncate(str, maxLen) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  return s.length > maxLen ? s.substring(0, maxLen) : s;
}

export function extractNik(value) {
  const text = cleanText(value);
  if (!text) return null;

  // Format like "20140002 - Muhammad Helmy"
  if (text.includes(" - ")) {
    const nikPart = text.split(" - ")[0].trim();
    if (nikPart) return nikPart;
  }

  // Format like "20140002-Muhammad Helmy" (dash followed by letters)
  const dashIndex = text.search(/-\s*[A-Za-z]/);
  if (dashIndex > 0) {
    const nikPart = text.substring(0, dashIndex).trim();
    if (nikPart) return nikPart;
  }

  // Format like "20140002 (Muhammad Helmy)"
  const parenIndex = text.indexOf('(');
  if (parenIndex > 0) {
    const nikPart = text.substring(0, parenIndex).trim();
    if (nikPart) return nikPart;
  }

  return text;
}

function extractName(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (text.includes(" - ")) {
    const parts = text.split(" - ");
    if (parts.length > 1 && parts[1].trim()) {
      return parts.slice(1).join(" - ").trim();
    }
  }
  return text;
}

const MONTH_MAP = {
  jan: '01', januari: '01', january: '01',
  feb: '02', februari: '02', february: '02',
  mar: '03', maret: '03', march: '03',
  apr: '04', april: '04',
  may: '05', mei: '05',
  jun: '06', juni: '06', june: '06',
  jul: '07', juli: '07', july: '07',
  aug: '08', agu: '08', agst: '08', agustus: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', okt: '10', oktober: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', des: '12', desember: '12', december: '12'
};

export function normalizeDate(val) {
  if (val === undefined || val === null) return null;

  // JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  // Excel Serial Number (e.g. 41904)
  if (typeof val === 'number' || (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim()))) {
    const num = Number(val);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(excelEpoch.getTime() + num * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    }
  }

  let str = cleanText(val);
  if (!str) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
    const [y, m, d] = str.split(/[\/\-]/);
    const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  // DD-MMM-YY or DD-MMM-YYYY (e.g. "22-Sep-14", "22-Sep-2014")
  const mmmMatch = str.match(/^(\d{1,2})[\s\/\-\._]+([A-Za-z]+)[\s\/\-\._]+(\d{2,4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const monthStr = mmmMatch[2].toLowerCase();
    let year = mmmMatch[3];
    if (year.length === 2) {
      const yNum = Number(year);
      year = yNum >= 70 ? `19${year}` : `20${year}`;
    }
    const monthNum = MONTH_MAP[monthStr];
    if (monthNum) {
      return `${year}-${monthNum}-${day}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      const yNum = Number(year);
      year = yNum >= 70 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Fallback Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return d.toISOString().split('T')[0];
  }

  return null;
}

function normalizeStatus(val, defaultVal = 'Active') {
  const cleaned = cleanText(val);
  if (!cleaned) return defaultVal;
  const lower = cleaned.toLowerCase();
  if (lower === 'active' || lower === 'aktif') return 'Active';
  if (lower === 'outsource' || lower === 'outsourcing') return 'Outsource';
  if (lower === 'resigned' || lower === 'resign' || lower === 'non-aktif' || lower === 'non aktif') return 'Resigned';
  return defaultVal;
}

function normalizeEmploymentStatus(val, defaultVal = 'Permanent') {
  const cleaned = cleanText(val);
  if (!cleaned) return defaultVal;
  const lower = cleaned.toLowerCase();
  if (lower.includes('permanent') || lower.includes('tetap') || lower.includes('pkwtt')) return 'Permanent';
  if (lower.includes('contract') || lower.includes('kontrak') || lower.includes('pkwt')) return 'Contract';
  if (lower.includes('freelance') || lower.includes('freelancer')) return 'Freelance';
  if (lower.includes('intern') || lower.includes('magang')) return 'Intern';
  return defaultVal;
}

function normalizeAssetStatus(val, defaultVal = 'In Use') {
  const cleaned = cleanText(val);
  if (!cleaned) return defaultVal;
  const lower = cleaned.toLowerCase();
  if (lower.includes('use') || lower.includes('pakai') || lower.includes('digunakan')) return 'In Use';
  if (lower.includes('stock') || lower.includes('stok') || lower.includes('tersedia')) return 'Stock';
  if (lower.includes('damaged') || lower.includes('rusak')) return 'Damaged';
  if (lower.includes('service') || lower.includes('perbaikan')) return 'In Service';
  if (lower.includes('disposal') || lower.includes('afkir')) return 'Disposal';
  return defaultVal;
}

function normalizeAssetKondisi(val, defaultVal = 'Normal') {
  const cleaned = cleanText(val);
  if (!cleaned) return defaultVal;
  const lower = cleaned.toLowerCase();
  if (lower.includes('baru') || lower.includes('new')) return 'Baru';
  if (lower.includes('normal') || lower.includes('baik') || lower.includes('good')) return 'Normal';
  if (lower.includes('rusak ringan') || lower.includes('ringan')) return 'Rusak Ringan';
  if (lower.includes('rusak sedang') || lower.includes('sedang')) return 'Rusak Sedang';
  if (lower.includes('rusak berat') || lower.includes('berat')) return 'Rusak Berat';
  return defaultVal;
}

function getPropCaseInsensitive(row, keys) {
  if (!row || typeof row !== 'object') return null;
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = cleanText(row[foundKey]);
      if (val !== null) return val;
    }
  }
  return null;
}

export async function importExcelData(req, res) {
  try {
    let karyawanRows = req.body?.karyawanRows || [];
    let assetRows = req.body?.assetRows || [];

    const totalKaryawanRows = karyawanRows.length;
    const totalAssetRows = assetRows.length;

    let importedKaryawanCount = 0;
    let updatedKaryawanCount = 0;
    let createdUserCount = 0;
    let existingUserCount = 0;
    let failedUserCount = 0;
    let importedAssetCount = 0;
    let updatedAssetCount = 0;
    const warnings = [];
    const errors = [];

    // ── Phase 1: Parse semua row karyawan, validasi NIK & Nama, kumpulkan data ──
    const parsedKaryawan = [];
    for (let i = 0; i < karyawanRows.length; i++) {
      const row = karyawanRows[i];
      const rowNum = i + 1;
      const nikRaw = getPropCaseInsensitive(row, ['NIK', 'nik', 'nomor_induk']);
      const nik = extractNik(nikRaw);
      const nama = getPropCaseInsensitive(row, ['Nama Karyawan', 'Nama', 'nama_karyawan', 'nama']);

      if (!nik || !nama) {
        errors.push({ row: rowNum, type: 'karyawan', reason: `NIK atau Nama tidak valid (NIK: "${nikRaw || '-'}", Nama: "${nama || '-'}")` });
        continue;
      }

      const emailRaw = getPropCaseInsensitive(row, ['Email Kantor', 'Email', 'email_kantor', 'email']);
      const email = emailRaw || (nik ? `${nik.toLowerCase()}@esb.co.id` : null);
      const lokasiRaw = getPropCaseInsensitive(row, ['Lokasi Kerja', 'Lokasi', 'lokasi_kerja', 'lokasi']);
      const lokasi = dashIfNull(normalizeLocation(lokasiRaw));
      const title = getPropCaseInsensitive(row, ['Title', 'Jabatan', 'title']) || 'User';
      const jobLevel = getPropCaseInsensitive(row, ['Job Level', 'Level', 'job_level']) || 'S1';
      const departemen = dashIfNull(getPropCaseInsensitive(row, ['Departemen', 'Department', 'departemen']));
      const direktorat = dashIfNull(getPropCaseInsensitive(row, ['Directorate', 'Direktorat', 'directorate']));

      const tglMulaiRaw = getPropCaseInsensitive(row, ['Tanggal Mulai Bekerja', 'Tanggal Mulai', 'tanggal_mulai_bekerja']);
      const tanggalMulai = normalizeDate(tglMulaiRaw) || new Date().toISOString().split('T')[0];

      const empStatusRaw = getPropCaseInsensitive(row, ['Employeement Status', 'Status Kepegawaian', 'employeement_status', 'status_kepegawaian']);
      const employeementStatus = normalizeEmploymentStatus(empStatusRaw);

      // FK field: tetap null agar disimpan sebagai NULL di DB
      const nikAtasanRaw = getPropCaseInsensitive(row, ['NIK Atasan Langsung', 'NIK Atasan', 'nik_atasan_langsung', 'nik_atasan']);
      const nikAtasan = extractNik(nikAtasanRaw);

      const statusRaw = getPropCaseInsensitive(row, ['Status', 'status']);
      const status = normalizeStatus(statusRaw);

      parsedKaryawan.push({
        rowNum,
        nik,
        nama,
        email,
        lokasi,
        title,
        jobLevel,
        departemen,
        direktorat,
        tanggalMulai,
        employeementStatus,
        nikAtasan,
        status,
      });
    }

    // ── Phase 2: Hash Default Password HANYA SEKALI sebelum loop ──
        const defaultPassword = env.auth.defaultUserPassword
        const defaultPasswordHash = await hashPassword(defaultPassword)

    // ── Phase 3: Proses Karyawan, User & Aset dalam SATU Database Transaction ──
    await withTransaction(async (client) => {
      // Pre-fetch semua user email existing di DB untuk pengecekan unik yang sangat cepat & efisien
      const dbUsersRes = await client.query(`SELECT LOWER(TRIM(email)) AS email FROM users WHERE email IS NOT NULL AND deleted_at IS NULL`);
      const dbUserEmailsSet = new Set(dbUsersRes.rows.map(r => r.email));
      const processedImportEmailsSet = new Set();

      for (const emp of parsedKaryawan) {
        try {
          // 1. Upsert Karyawan
          const existingEmpRes = await client.query(`SELECT id FROM karyawan WHERE nik = $1`, [emp.nik]);

          if (existingEmpRes.rows.length > 0) {
            await client.query(
              `UPDATE karyawan SET
                nama_karyawan = $2, email_kantor = $3, lokasi_kerja = $4,
                title = $5, job_level = $6, departemen = $7, directorate = $8,
                status = $9, employeement_status = $10,
                tanggal_mulai_bekerja = COALESCE($11, tanggal_mulai_bekerja),
                updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [existingEmpRes.rows[0].id, emp.nama, emp.email, emp.lokasi, emp.title, emp.jobLevel, emp.departemen, emp.direktorat, emp.status, emp.employeementStatus, emp.tanggalMulai]
            );
            updatedKaryawanCount++;
          } else {
            await client.query(
              `INSERT INTO karyawan (nik, nama_karyawan, email_kantor, lokasi_kerja, 
                                     title, job_level, departemen, directorate, status,
                                     tanggal_mulai_bekerja, employeement_status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [emp.nik, emp.nama, emp.email, emp.lokasi, emp.title, emp.jobLevel, emp.departemen, emp.direktorat, emp.status, emp.tanggalMulai, emp.employeementStatus]
            );
            importedKaryawanCount++;
          }

          // 2. Sinkronisasi Akun User (1 Karyawan Valid = 1 User)
          if (!emp.email) {
            failedUserCount++;
            errors.push({ row: emp.rowNum, type: 'user', reason: `Karyawan ${emp.nik} (${emp.nama}) tidak memiliki email valid` });
          } else {
            const normEmail = emp.email.trim().toLowerCase();
            if (dbUserEmailsSet.has(normEmail)) {
              existingUserCount++;
            } else if (processedImportEmailsSet.has(normEmail)) {
              existingUserCount++;
            } else {
              try {
                const DEFAULT_IMPORT_PERMISSIONS = JSON.stringify({
                            dashboard: 'read_only',
                            assets: 'none',
                            my_assets: 'read_only',
                            tickets: 'read_only',
                            submissions: 'none',
                            users: 'none',
                            logs: 'none',
                            karyawan: 'none',
                          });

                          await client.query(
                            `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
                             VALUES ($1, $2, $3, 'user', $4::jsonb, true)`,
                            [emp.nama, emp.email, defaultPasswordHash, DEFAULT_IMPORT_PERMISSIONS]
                );
                createdUserCount++;
                dbUserEmailsSet.add(normEmail);
                processedImportEmailsSet.add(normEmail);
              } catch (userErr) {
                failedUserCount++;
                errors.push({ row: emp.rowNum, type: 'user', reason: `Gagal membuat user untuk ${emp.email}: ${userErr.message}` });
              }
            }
          }
        } catch (err) {
          errors.push({ row: emp.rowNum, type: 'karyawan', reason: `${emp.nik} (${emp.nama}): ${err.message}` });
        }
      }

      // Update nik_atasan_langsung setelah semua NIK di-insert/update
      for (const emp of parsedKaryawan) {
        if (!emp.nikAtasan) continue;

        try {
          const atasanRes = await client.query(`SELECT nik FROM karyawan WHERE nik = $1`, [emp.nikAtasan]);
          if (atasanRes.rows.length === 0) {
            warnings.push(`Row ${emp.rowNum}: NIK Atasan "${emp.nikAtasan}" tidak ditemukan di database`);
            continue;
          }
          await client.query(
            `UPDATE karyawan SET nik_atasan_langsung = $1, updated_at = CURRENT_TIMESTAMP WHERE nik = $2`,
            [emp.nikAtasan, emp.nik]
          );
        } catch (err) {
          errors.push({ row: emp.rowNum, type: 'karyawan_atasan', reason: `Atasan untuk ${emp.nik}: ${err.message}` });
        }
      }

      // ── Process Asset Rows ──
      for (let i = 0; i < assetRows.length; i++) {
        const row = assetRows[i];
        const rawHostname = getPropCaseInsensitive(row, ['Hostname', 'Label Aset', 'Label', 'hostname', 'label_aset']);
        const rawSerialNumber = getPropCaseInsensitive(row, ['Serial Number', 'Serial', 'SN', 'serial_number', 'nomor_seri']);
        const spesifikasi = dashIfNull(getPropCaseInsensitive(row, ['Spesifikasi', 'Spec', 'spesifikasi']));

        const nikPemegangRaw = getPropCaseInsensitive(row, ['NIK Pemegang', 'NIK Pemegang Asset', 'NIK', 'nik_pemegang_asset', 'nik']);
        const nikPemegang = extractNik(nikPemegangRaw);

        const namaPemegangRaw = getPropCaseInsensitive(row, ['Nama Karyawan Pemegang', 'Nama Karyawan', 'nama_karyawan_pemegang_asset', 'nama_karyawan']);
        const namaPemegang = extractName(namaPemegangRaw);
        const deptPemegang = dashIfNull(getPropCaseInsensitive(row, ['Departemen Pemegang', 'Departemen', 'departemen_pemegang_asset', 'departemen']));
        const lokasiAsetRaw = getPropCaseInsensitive(row, ['Lokasi Aset', 'Lokasi', 'lokasi_asset', 'lokasi_kerja']);
        const lokasiAset = dashIfNull(normalizeLocation(lokasiAsetRaw));
        const tipePerangkat = getPropCaseInsensitive(row, ['Tipe Perangkat', 'Tipe', 'tipe_perangkat']) || 'Laptop';
        const brandMerek = dashIfNull(getPropCaseInsensitive(row, ['Brand/Merek', 'Merek', 'Brand', 'brand_merek']));
        const model = dashIfNull(getPropCaseInsensitive(row, ['Model', 'model']));

        const statusRaw = getPropCaseInsensitive(row, ['Status', 'status']);
        const status = normalizeAssetStatus(statusRaw);

        const kondisiRaw = getPropCaseInsensitive(row, ['Kondisi', 'kondisi']);
        const kondisi = normalizeAssetKondisi(kondisiRaw);

        const noteAsset = dashIfNull(getPropCaseInsensitive(row, ['Note Asset', 'Catatan', 'note_asset']));

        const rowNum = i + 1;
        const rowSuffix = String(rowNum).padStart(4, '0');

        let hostnameFinal = rawHostname;
        let serialFinal = rawSerialNumber;

        if (!hostnameFinal && !serialFinal) {
          hostnameFinal = `AST-${rowSuffix}`;
          serialFinal = `SN-${rowSuffix}`;
        } else if (!hostnameFinal) {
          hostnameFinal = `HOST-${serialFinal}`;
        } else if (!serialFinal) {
          serialFinal = `SN-${hostnameFinal}`;
        }

        const targetHostname = safeTruncate(hostnameFinal, 50);
        const targetSerial = safeTruncate(serialFinal, 50);

        try {
          let resolvedNik = null;
          let resolvedNama = safeTruncate(namaPemegang, 150);
          let resolvedDept = safeTruncate(deptPemegang, 100);
          let resolvedLokasi = safeTruncate(lokasiAset, 100);

          if (nikPemegang) {
            const empRes = await client.query(`SELECT nik, nama_karyawan, departemen, lokasi_kerja FROM karyawan WHERE nik = $1`, [nikPemegang]);
            if (empRes.rows.length > 0) {
              resolvedNik = empRes.rows[0].nik;
              if (!resolvedNama || resolvedNama === '-') resolvedNama = safeTruncate(empRes.rows[0].nama_karyawan, 150);
              if (!resolvedDept || resolvedDept === '-') resolvedDept = safeTruncate(empRes.rows[0].departemen, 100);
              if (!resolvedLokasi || resolvedLokasi === '-') resolvedLokasi = safeTruncate(empRes.rows[0].lokasi_kerja, 100);
            }
          }

          const safeTipe = safeTruncate(tipePerangkat, 50) || 'Laptop';
          const safeBrand = safeTruncate(brandMerek, 50);
          const safeModel = safeTruncate(model, 100);
          const safeNote = safeTruncate(noteAsset, 255);

          await client.query(
            `INSERT INTO aset_ti (hostname, serial_number, spesifikasi, nik_pemegang_asset,
                                  nama_karyawan_pemegang_asset, departemen_pemegang_asset, lokasi_asset,
                                  tipe_perangkat, brand_merek, model, status, kondisi, note_asset)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [targetHostname, targetSerial, spesifikasi, resolvedNik,
             resolvedNama, resolvedDept, resolvedLokasi, safeTipe, safeBrand, safeModel,
             status, kondisi, safeNote]
          );
          importedAssetCount++;
        } catch (err) {
          errors.push({ row: rowNum, type: 'asset', reason: err.message });
        }
      }
    });

    const totalKaryawanProcessed = importedKaryawanCount + updatedKaryawanCount;
    const skippedKaryawan = totalKaryawanRows - parsedKaryawan.length;
    const totalAssetsProcessed = importedAssetCount + updatedAssetCount;
    const skippedAssets = totalAssetRows - totalAssetsProcessed;

    const totalUsersAccounted = createdUserCount + existingUserCount;
    if (parsedKaryawan.length > 0 && totalUsersAccounted < parsedKaryawan.length) {
      warnings.push(`Peringatan Rekonsiliasi: ${parsedKaryawan.length} karyawan diproses, tetapi hanya ${totalUsersAccounted} user terproses (${failedUserCount} gagal/invalid email).`);
    }

    res.json({
      success: true,
      message: `Proses import sukses! ${totalKaryawanProcessed} Karyawan (${createdUserCount} Akun User baru, ${existingUserCount} User existing) dan ${totalAssetsProcessed} Aset IT berhasil diproses.`,
      details: {
        totalKaryawanRows,
        totalAssetRows,
        processedKaryawan: parsedKaryawan.length,
        importedKaryawanCount,
        updatedKaryawanCount,
        skippedKaryawan,
        createdUserCount,
        existingUserCount,
        failedUserCount,
        importedAssetCount,
        updatedAssetCount,
        skippedAssets,
        warnings: warnings.concat(errors.map(e => `Row ${e.row} (${e.type}): ${e.reason}`)),
        errors,
      },
    });

  } catch (error) {
    console.error('[Import Excel Error]', error);
    res.status(500).json({ error: error.message || 'Gagal memproses import data Excel.' });
  }
}