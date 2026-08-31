import { Router } from 'express'
import { authorizeRoles } from '../middleware/authMiddleware.js'
import {
  listCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,
} from '../controllers/caseController.js'

export const caseRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')

caseRouter.get('/', requireAdmin, listCases)
caseRouter.get('/:id', requireAdmin, getCase)
caseRouter.post('/', requireAdmin, createCase)
caseRouter.put('/:id', requireAdmin, updateCase)
caseRouter.delete('/:id', requireAdmin, deleteCase)
