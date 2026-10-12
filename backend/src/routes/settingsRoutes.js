import { Router } from 'express'
import {
  getEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  resetEmailTemplate,
} from '../controllers/settingsController.js'
import { authorizeRoles } from '../middleware/authMiddleware.js'

export const settingsRouter = Router()

const requireSuperadmin = authorizeRoles('superadmin', 'super admin')
settingsRouter.use(requireSuperadmin)

// SMTP & General Email Settings
settingsRouter.get('/email', getEmailSettings)
settingsRouter.put('/email', updateEmailSettings)
settingsRouter.post('/email/test', sendTestEmail)

// Dynamic Email Templates
settingsRouter.get('/email/templates', getEmailTemplates)
settingsRouter.get('/email/templates/:key', getEmailTemplate)
settingsRouter.put('/email/templates/:key', updateEmailTemplate)
settingsRouter.post('/email/templates/:key/reset', resetEmailTemplate)
