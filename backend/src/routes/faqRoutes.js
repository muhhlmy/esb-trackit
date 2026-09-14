import { Router } from 'express'
import {
  authorizePermission,
  authorizeRoles,
} from '../middleware/authMiddleware.js'
import {
  listFaqs,
  getFaq,
  createFaq,
  updateFaq,
  deleteFaq,
} from '../controllers/faqController.js'

export const faqRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')
const requireKbRead = authorizePermission('knowledge_base', 'read')
const requireKbWrite = authorizePermission('knowledge_base', 'write')

faqRouter.use(requireAdmin)

faqRouter.get('/', requireKbRead, listFaqs)
faqRouter.get('/:id', requireKbRead, getFaq)
faqRouter.post('/', requireKbWrite, createFaq)
faqRouter.put('/:id', requireKbWrite, updateFaq)
faqRouter.delete('/:id', requireKbWrite, deleteFaq)
