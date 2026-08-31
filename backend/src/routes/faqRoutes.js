import { Router } from 'express'
import { authorizeRoles } from '../middleware/authMiddleware.js'
import {
  listFaqs,
  getFaq,
  createFaq,
  updateFaq,
  deleteFaq,
} from '../controllers/faqController.js'

export const faqRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')

faqRouter.get('/', requireAdmin, listFaqs)
faqRouter.get('/:id', requireAdmin, getFaq)
faqRouter.post('/', requireAdmin, createFaq)
faqRouter.put('/:id', requireAdmin, updateFaq)
faqRouter.delete('/:id', requireAdmin, deleteFaq)
