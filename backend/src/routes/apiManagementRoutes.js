import { Router } from 'express';
import {
  handleCreateClient,
  handleListClients,
  handleGetClient,
  handleUpdateClient,
  handleRotateSecret,
  handleRevokeClient,
} from '../controllers/apiClientController.js';
import {
  handleCreateSubscription,
  handleListSubscriptions,
  handleGetSubscription,
  handleUpdateSubscription,
  handleDeleteSubscription,
  handleListDeliveries,
  handleTestDispatch,
} from '../controllers/webhookController.js';
import {
  getSystemStatus,
  getSystemCapabilities,
} from '../controllers/systemController.js';
import { authenticateUserOrApiClient } from '../middleware/apiClientAuthMiddleware.js';

export const apiManagementRouter = Router();

function requireAdminOrManageScope(scope) {
  return (req, res, next) => {
    if (req.user) {
      const role = (req.user.role || '').toLowerCase();
      if (role === 'superadmin' || role === 'super admin' || role === 'admin') {
        return next();
      }
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Administrator privileges are required for this operation.' },
      });
    }

    if (req.apiClient) {
      const scopes = Array.isArray(req.apiClient.scopes) ? req.apiClient.scopes : [];
      if (scopes.includes(scope) || scopes.includes('*')) {
        return next();
      }
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `API client is missing the required scope '${scope}'.`,
          requiredScopes: [scope],
        },
      });
    }

    return res.status(401).json({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication credentials are required.' },
    });
  };
}

// System discovery (Publik / Observability)
apiManagementRouter.get('/system/status', getSystemStatus);
apiManagementRouter.get('/system/capabilities', getSystemCapabilities);

// Middleware guard untuk endpoints manajemen
const clientAuthGuard = [authenticateUserOrApiClient, requireAdminOrManageScope('api_clients:manage')];
const webhookAuthGuard = [authenticateUserOrApiClient, requireAdminOrManageScope('webhooks:manage')];

// API Client Management
apiManagementRouter.get('/api-clients', clientAuthGuard, handleListClients);
apiManagementRouter.post('/api-clients', clientAuthGuard, handleCreateClient);
apiManagementRouter.get('/api-clients/:id', clientAuthGuard, handleGetClient);
apiManagementRouter.patch('/api-clients/:id', clientAuthGuard, handleUpdateClient);
apiManagementRouter.post('/api-clients/:id/rotate-secret', clientAuthGuard, handleRotateSecret);
apiManagementRouter.post('/api-clients/:id/revoke', clientAuthGuard, handleRevokeClient);

// Webhook Subscriptions & Deliveries
apiManagementRouter.get('/webhook-subscriptions', webhookAuthGuard, handleListSubscriptions);
apiManagementRouter.post('/webhook-subscriptions', webhookAuthGuard, handleCreateSubscription);
apiManagementRouter.get('/webhook-subscriptions/:id', webhookAuthGuard, handleGetSubscription);
apiManagementRouter.patch('/webhook-subscriptions/:id', webhookAuthGuard, handleUpdateSubscription);
apiManagementRouter.delete('/webhook-subscriptions/:id', webhookAuthGuard, handleDeleteSubscription);
apiManagementRouter.get('/webhook-deliveries', webhookAuthGuard, handleListDeliveries);
apiManagementRouter.post('/webhook-test', webhookAuthGuard, handleTestDispatch);
