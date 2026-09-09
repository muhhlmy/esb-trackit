import { pool } from '../src/config/database.js';

export async function provisionTipeAsetGa() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tipe_aset_ga (
      id          SERIAL PRIMARY KEY,
      nama_tipe   VARCHAR(100) NOT NULL UNIQUE,
      deskripsi   TEXT,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at  TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tipe_aset_ga_nama ON tipe_aset_ga(nama_tipe);
  `);

  const initialTypes = [
    'Meja', 'Kursi', 'AC', 'Lemari', 'Sofa', 'Rak', 'Printer', 'Dispenser', 'TV', 'Lainnya'
  ];

  for (const t of initialTypes) {
    await pool.query(
      'INSERT INTO tipe_aset_ga (nama_tipe) VALUES ($1) ON CONFLICT (nama_tipe) DO NOTHING',
      [t]
    );
  }

  const res = await pool.query('SELECT id, nama_tipe FROM tipe_aset_ga ORDER BY id ASC');
  return res.rows;
}

if (process.argv[1] && process.argv[1].includes('provision_tipe_aset_ga.js')) {
  provisionTipeAsetGa()
    .then((rows) => {
      console.log('tipe_aset_ga provisioned successfully:', rows);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to provision tipe_aset_ga:', err);
      process.exit(1);
    });
}
