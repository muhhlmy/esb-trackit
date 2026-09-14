import { Router } from 'express'
import {
  authorizePermission,
  authorizeRoles,
} from '../middleware/authMiddleware.js'
import {
  listKbCategories,
  getKbCategory,
  createKbCategory,
  updateKbCategory,
  deleteKbCategory,
} from '../controllers/kbCategoryController.js'

export const kbCategoryRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')
const requireKbRead = authorizePermission('knowledge_base', 'read')
const requireKbWrite = authorizePermission('knowledge_base', 'write')

kbCategoryRouter.use(requireAdmin)

kbCategoryRouter.get('/', requireKbRead, listKbCategories)
kbCategoryRouter.get('/:id', requireKbRead, getKbCategory)
kbCategoryRouter.post('/', requireKbWrite, createKbCategory)
kbCategoryRouter.put('/:id', requireKbWrite, updateKbCategory)
kbCategoryRouter.delete('/:id', requireKbWrite, deleteKbCategory)
