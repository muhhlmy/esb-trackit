import { PrismaClient } from '../generated/prisma/index.js';
import './env.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
