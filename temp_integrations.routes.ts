import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// Integration schema for validation
const IntegrationSchema = z.object({
  type: z.enum(['SLACK', 'GOOGLE_DRIVE', 'DROPBOX', 'ONEDRIVE']),
  credentials: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// ... (rest of the implementation remains the same as in the previous message)
