import { Router } from 'express'
import * as gaAssetController from '../controllers/gaAssetController.js'
import {
  authorizeAnyPermission,
  authorizePermission,
  authorizeRoles,
} from '../middleware/authMiddleware.js'

export const gaAssetRouter = Router()

const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')
const requireGaRead = authorizeAnyPermission(['assets_ga', 'assets'], 'read')
const requireGaWrite = authorizeAnyPermission(['assets_ga', 'assets'], 'write')

gaAssetRouter.use(requireAdmin)

gaAssetRouter.get('/types', requireGaRead, gaAssetController.listGaAssetTypes)
gaAssetRouter.post('/types', requireGaWrite, gaAssetController.addGaAssetType)
gaAssetRouter.put('/types/:id', requireGaWrite, gaAssetController.updateGaAssetType)
gaAssetRouter.delete('/types/:id', requireGaWrite, gaAssetController.deleteGaAssetType)

gaAssetRouter.get('/', requireGaRead, gaAssetController.listGaAssets)
gaAssetRouter.get('/:id', requireGaRead, gaAssetController.fetchGaAsset)
gaAssetRouter.post('/', requireGaWrite, gaAssetController.addGaAsset)
gaAssetRouter.put('/:id', requireGaWrite, gaAssetController.replaceGaAsset)
gaAssetRouter.delete('/:id', requireGaWrite, gaAssetController.deleteGaAsset)
