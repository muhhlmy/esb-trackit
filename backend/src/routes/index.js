import { Router } from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js'
import { assetRouter }    from './assetRoutes.js'
import { gaAssetRouter }  from './gaAssetRoutes.js'
import { opsAssetRouter } from './opsAssetRoutes.js'
import { employeeRouter } from './employeeRoutes.js'
import { healthRouter }   from './healthRoutes.js'
import { userRouter }     from './userRoutes.js'
import { logRouter }      from './logRoutes.js'
import { ticketRouter }   from './ticketRoutes.js'
import { queueRouter }    from './queueRoutes.js'
import { exportRouter }   from './exportRoutes.js'
import importRouter       from './importRoutes.js'
import { backupRouter }   from './backupRoutes.js'
import { faqRouter }      from './faqRoutes.js'
import { listPublicFaqs } from '../controllers/faqController.js'
import { caseRouter }      from './caseRoutes.js'
import { listPublicCases } from '../controllers/caseController.js'
import { kbCategoryRouter } from './kbCategoryRoutes.js'
import { listPublicKbCategories } from '../controllers/kbCategoryController.js'
import { kbSearchLogRouter } from './kbSearchLogRoutes.js'
import { listPopularKbSearches } from '../controllers/kbSearchLogController.js'
import { caseBookmarkRouter } from './caseBookmarkRoutes.js'
import authRoutes from './authRoutes.js'
import { apiRateLimiter, authenticatedUserRateLimiter } from '../middleware/rateLimitMiddleware.js'

export const router = Router()

// Layer 1: Public/Global IP abuse protection
router.use('/health',     healthRouter)
router.use('/api',        apiRateLimiter)
router.use('/api/auth',   authRoutes)

// Layer 2: Authenticated per-user rate limiting middleware combination
const authStack = [authenticateToken, authenticatedUserRateLimiter]

// Canonical RESTful endpoints & backward-compatible aliases
router.use('/api/assets',        authStack, assetRouter)
router.use('/api/ga-assets',     authStack, gaAssetRouter)
router.use('/api/assets-ga',     authStack, gaAssetRouter)
router.use('/api/assets_ga',     authStack, gaAssetRouter) // Deprecated snake_case alias
router.use('/api/ops-assets',    authStack, opsAssetRouter)
router.use('/api/assets-ops',    authStack, opsAssetRouter)
router.use('/api/assets_ops',    authStack, opsAssetRouter) // Deprecated snake_case alias
router.use('/api/tickets',       authStack, ticketRouter)
router.use('/api/ticket-queues', authStack, queueRouter)
router.use('/api/export',        authStack, exportRouter)

// Public Help Center FAQ (read-only, published only, no auth)
router.get('/api/faqs/public',  listPublicFaqs)
router.use('/api/faqs',         authStack, faqRouter)

// Public Help Center Cases/Artikel (read-only, published only, no auth)
router.get('/api/cases/public', listPublicCases)
router.use('/api/cases',        authStack, caseRouter)

// Public Help Center KB Categories/topic cards (read-only, published only, no auth)
router.get('/api/kb-categories/public', listPublicKbCategories)
router.use('/api/kb-categories',        authStack, kbCategoryRouter)

// Popular searches Help Center (read-only, no auth) + search logging & stats
router.get('/api/kb-search-logs/popular', listPopularKbSearches)
router.use('/api/kb-search-logs',         authStack, kbSearchLogRouter)

// Case bookmarks per-user (selalu dalam konteks user login)
router.use('/api/case-bookmarks', authStack, caseBookmarkRouter)

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')

router.use('/api/employees', authStack, requireAdmin, employeeRouter) // Canonical endpoint
router.use('/api/karyawan',  authStack, requireAdmin, employeeRouter) // Legacy alias
router.use('/api/users',     authStack, requireAdmin, userRouter)
router.use('/api/logs',      authStack, requireAdmin, logRouter)
router.use('/api/import',    authStack, requireAdmin, importRouter)
router.use('/api/admin/database', authStack, backupRouter)
