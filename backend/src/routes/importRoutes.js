import { Router } from 'express'
import { importCategoryAssets, importExcelData } from '../controllers/importController.js'
import { authorizeAnyPermission } from '../middleware/authMiddleware.js'

export const importRouter = Router()

const requireImportWrite = authorizeAnyPermission(
  ['karyawan', 'assets', 'assets_ga', 'assets_ops', 'users'],
  'write',
)

importRouter.post('/excel', requireImportWrite, importExcelData)
importRouter.post('/excel-assets', requireImportWrite, importCategoryAssets)

export default importRouter
