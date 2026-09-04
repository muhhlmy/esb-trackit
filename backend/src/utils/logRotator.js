import fs from 'fs'

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_BACKUP_FILES = 3

/**
 * Rotates a log file if its size exceeds MAX_LOG_SIZE_BYTES.
 * Rotates file.log -> file.log.1, file.log.1 -> file.log.2, etc.
 * @param {string} logFilePath
 */
export function rotateLogFileIfNeeded(logFilePath) {
  try {
    if (!fs.existsSync(logFilePath)) return

    const stats = fs.statSync(logFilePath)
    if (stats.size < MAX_LOG_SIZE_BYTES) return

    for (let i = MAX_BACKUP_FILES - 1; i >= 1; i--) {
      const src = `${logFilePath}.${i}`
      const dest = `${logFilePath}.${i + 1}`
      if (fs.existsSync(src)) {
        if (i === MAX_BACKUP_FILES - 1) {
          fs.unlinkSync(src)
        } else {
          fs.renameSync(src, dest)
        }
      }
    }

    const firstBackup = `${logFilePath}.1`
    if (fs.existsSync(firstBackup)) {
      fs.unlinkSync(firstBackup)
    }
    fs.renameSync(logFilePath, firstBackup)
  } catch {
    // Non-fatal if rotation fails; avoid crashing app on logging
  }
}

/**
 * Append line to log file with automatic rotation.
 * @param {string} logFilePath
 * @param {string} message
 */
export function appendRotatingLog(logFilePath, message) {
  try {
    rotateLogFileIfNeeded(logFilePath)
    fs.appendFileSync(logFilePath, message)
  } catch {
    // Ignore logging write failures to prevent crash
  }
}
