import { app } from "./app.js";
import { pool, query } from "./config/database.js";
import { env } from "./config/env.js";
import { drainHttpServer } from "./services/shutdownService.js";
import { verifyRuntimeSchema } from "./config/runtimeSchema.js";
import { closeAllSseClients } from "./services/realtimeService.js";
import { appendRotatingLog } from "./utils/logRotator.js";

const LOG_FILE = './server_error.log';
function logError(msg) {
  const timestamp = new Date().toISOString();
  appendRotatingLog(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.message);
  logError(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack || ''}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'Reason:', reason);
  logError(`UNHANDLED REJECTION: ${reason}\nPromise: ${promise}`);
});

let isShuttingDown = false;
let server = null;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} diterima, menutup server secara graceful...`);

  // Fail-safe timeout: paksa keluar jika shutdown macet lebih dari 10 detik
  const forceExitTimer = setTimeout(() => {
    console.error('Batas waktu graceful shutdown terlampaui (10s), mematikan paksa...');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  // 1. Stop HTTP listener (tidak menerima koneksi baru)
  if (server) {
    try {
      await drainHttpServer(server, () => closeAllSseClients('Server sedang dimatikan.'));
      console.log('HTTP server berhasil ditutup.');
    } catch (error) {
      console.error('Gagal menutup HTTP server:', error.message);
    }
  }

  // 3. Tutup connection pool database PostgreSQL
  try {
    await pool.end();
    console.log('Database pool berhasil ditutup.');
  } catch (error) {
    console.error('Gagal menutup pool database:', error.message);
  }

  clearTimeout(forceExitTimer);
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

try {
  // Coba koneksi sebelum menjalankan server
  await query('SELECT 1');
  await verifyRuntimeSchema(pool);
} catch (error) {
  console.error("Database belum siap digunakan:", error.message);
  process.exit(1);
}

console.log(`API berjalan di http://${env.host}:${env.port}`);
server = app.listen(env.port, env.host);