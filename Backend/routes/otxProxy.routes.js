// PATCH 47 Extension: OTX Proxy Routes
import express from 'express';
import { getOTXData, clearOTXCache } from '../controllers/otxProxy.controller.js';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// SECURITY: require authentication (this Express route is not used by the frontend,
// which serves its own /otx-proxy Next.js handler). Prevents unauthenticated
// server-side outbound fetches / upstream quota abuse.
router.use(authenticateToken);

// Rate limiting for OTX endpoint (threat data updates less frequently)
const otxRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many OTX requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
router.get('/', otxRateLimiter, getOTXData);
router.post('/clear-cache', otxRateLimiter, clearOTXCache);

export default router;
