import { query } from '../config/database.js'

export async function checkHealth(req, res) {
  try {
    await query('SELECT 1')
    res.json({ status: 'healthy' })
  } catch {
    res.status(503).json({ status: 'unhealthy' })
  }
}

export function checkLiveness(req, res) {
  res.json({
    status: 'live',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
  })
}

export async function checkReadiness(req, res) {
  try {
    await query('SELECT 1')
    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
