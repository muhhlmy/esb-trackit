import { Router } from 'express'
import { authorizeRoles } from '../middleware/authMiddleware.js'
import {
  listKbCategories,
  getKbCategory,
  createKbCategory,
  updateKbCategory,
  deleteKbCategory,
} from '../controllers/kbCategoryController.js'

export const kbCategoryRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')

kbCategoryRouter.get('/', requireAdmin, listKbCategories)
kbCategoryRouter.get('/:id', requireAdmin, getKbCategory)
kbCategoryRouter.post('/', requireAdmin, createKbCategory)
kbCategoryRouter.put('/:id', requireAdmin, updateKbCategory)
kbCategoryRouter.delete('/:id', requireAdmin, deleteKbCategory)
