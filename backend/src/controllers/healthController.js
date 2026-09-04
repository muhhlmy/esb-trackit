import { query } from '../config/database.js'

export async function checkHealth(req, res) {
  try {
    await query('SELECT 1')
    res.json({ status: 'healthy' })
  } catch {
    res.status(503).json({ status: 'unhealthy' })
  }
}

