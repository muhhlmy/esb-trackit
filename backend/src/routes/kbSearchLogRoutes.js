import { Router } from 'express'
import { authorizeRoles } from '../middleware/authMiddleware.js'
import {
  logKbSearch,
  getKbSearchStats,
} from '../controllers/kbSearchLogController.js'

export const kbSearchLogRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')

// Pencatatan pencarian terbuka untuk semua user terautentikasi.
kbSearchLogRouter.post('/', logKbSearch)
kbSearchLogRouter.get('/stats', requireAdmin, getKbSearchStats)
