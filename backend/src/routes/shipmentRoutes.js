import { Router } from 'express'
import { authorizePermission } from '../middleware/authMiddleware.js'
import * as shipmentController from '../controllers/shipmentController.js'

export const shipmentRouter = Router()

const requireRead = authorizePermission('shipments', 'read')
const requireWrite = authorizePermission('shipments', 'write')

shipmentRouter.get('/', requireRead, shipmentController.listShipments)
shipmentRouter.get('/:id', requireRead, shipmentController.getShipmentById)
shipmentRouter.post('/', requireWrite, shipmentController.createShipment)
shipmentRouter.post('/import', requireWrite, shipmentController.importShipments)
shipmentRouter.put('/:id', requireWrite, shipmentController.updateShipment)
shipmentRouter.patch('/:id', requireWrite, shipmentController.updateShipment)
shipmentRouter.delete('/:id', requireWrite, shipmentController.deleteShipment)
