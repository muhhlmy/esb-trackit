import * as webhookService from '../services/webhookService.js';
import { AppError, ERROR_CODES } from '../errors/AppError.js';

export async function handleCreateSubscription(req, res, next) {
  try {
    const { clientId, targetUrl, events, secret } = req.body || {};

    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'targetUrl wajib diisi.', 400);
    }

    const sub = await webhookService.createWebhookSubscription({
      clientId: clientId || null,
      targetUrl: targetUrl.trim(),
      secret: typeof secret === 'string' && secret.trim() ? secret.trim() : null,
      events: Array.isArray(events) && events.length > 0 ? events : ['ticket.created', 'asset.created'],
    });

    res.status(201).json({
      message: 'Webhook subscription berhasil didaftarkan.',
      data: sub,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleListSubscriptions(req, res, next) {
  try {
    const clientId = req.query.client_id || null;
    const subscriptions = await webhookService.listWebhookSubscriptions(clientId);
    res.json({ data: subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function handleGetSubscription(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const sub = await webhookService.getWebhookSubscriptionById(id);
    if (!sub) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Webhook subscription tidak ditemukan.', 404);
    }
    res.json({ data: sub });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateSubscription(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { targetUrl, events, isActive } = req.body || {};

    const updated = await webhookService.updateWebhookSubscription(id, {
      targetUrl,
      events,
      isActive,
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Webhook subscription tidak ditemukan.', 404);
    }

    res.json({
      message: 'Webhook subscription berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteSubscription(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await webhookService.deleteWebhookSubscription(id);
    if (!deleted) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Webhook subscription tidak ditemukan.', 404);
    }
    res.json({ message: 'Webhook subscription berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}

export async function handleListDeliveries(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const subscriptionId = req.query.subscription_id ? parseInt(req.query.subscription_id, 10) : null;

    const deliveries = await webhookService.listWebhookDeliveries({ limit, subscriptionId });
    res.json({ data: deliveries });
  } catch (error) {
    next(error);
  }
}

export async function handleTestDispatch(req, res, next) {
  try {
    const { event = 'system.ping', payload = { message: 'Test webhook ping dari TrackIT' } } = req.body || {};
    const result = await webhookService.dispatchWebhookEvent(event, payload);
    res.json({
      message: `Event '${event}' dikirim ke ${result.dispatched} subscription penerima.`,
      result,
    });
  } catch (error) {
    next(error);
  }
}
