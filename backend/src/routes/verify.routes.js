import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyCertificate } from '../controllers/verify.controller.js';

const verifyRouter = express.Router();

// Rate limiter: 30 requests per minute per IP
const verifyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many verification requests from this IP, please try again in a minute.',
  },
});

verifyRouter.get('/:verifyId', verifyRateLimiter, verifyCertificate);

export default verifyRouter;
