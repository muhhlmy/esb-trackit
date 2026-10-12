import * as apiClientService from '../services/apiClientService.js';
import { AppError, ERROR_CODES } from '../errors/AppError.js';

export async function handleCreateClient(req, res, next) {
  try {
    const { name, organization, scopes, rateLimit, expiresAt } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Nama API Client wajib diisi.', 400);
    }

    const client = await apiClientService.createApiClient({
      name: name.trim(),
      organization: typeof organization === 'string' ? organization.trim() : '',
      scopes: Array.isArray(scopes) ? scopes : ['assets:read'],
      rateLimit: Number.isInteger(rateLimit) && rateLimit > 0 ? rateLimit : 120,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json({
      message: 'API Client berhasil dibuat. Simpan API Key ini karena tidak akan ditampilkan lagi.',
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleListClients(req, res, next) {
  try {
    const clients = await apiClientService.listApiClients();
    res.json({ data: clients });
  } catch (error) {
    next(error);
  }
}

export async function handleGetClient(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const client = await apiClientService.getApiClientById(id);
    if (!client) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'API Client tidak ditemukan.', 404);
    }
    res.json({ data: client });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateClient(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, organization, scopes, rateLimit, isActive } = req.body || {};

    const updated = await apiClientService.updateApiClient(id, {
      name,
      organization,
      scopes,
      rateLimit,
      isActive,
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'API Client tidak ditemukan.', 404);
    }

    res.json({
      message: 'API Client berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleRotateSecret(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await apiClientService.rotateApiClientSecret(id);
    if (!result) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'API Client tidak ditemukan.', 404);
    }

    res.json({
      message: 'Secret API Client berhasil dirotasi. Simpan API Key baru ini dengan aman.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleRevokeClient(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await apiClientService.revokeApiClient(id);
    if (!result) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'API Client tidak ditemukan.', 404);
    }

    res.json({
      message: 'Akses API Client berhasil dicabut.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
