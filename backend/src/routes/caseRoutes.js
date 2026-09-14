import { Router } from 'express'
import {
  authorizePermission,
  authorizeRoles,
} from '../middleware/authMiddleware.js'
import {
  listCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,
} from '../controllers/caseController.js'

export const caseRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')
const requireKbRead = authorizePermission('knowledge_base', 'read')
const requireKbWrite = authorizePermission('knowledge_base', 'write')

caseRouter.use(requireAdmin)

caseRouter.get('/', requireKbRead, listCases)
caseRouter.get('/:id', requireKbRead, getCase)
caseRouter.post('/', requireKbWrite, createCase)
caseRouter.put('/:id', requireKbWrite, updateCase)
caseRouter.delete('/:id', requireKbWrite, deleteCase)
