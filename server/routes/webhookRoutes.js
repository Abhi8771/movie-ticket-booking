import express from 'express';
import bodyParser from 'body-parser';
import { stripeWebhooks } from '../controllers/stripeWebhooks.js';

const router = express.Router();

// Stripe requires raw body for webhooks
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), stripeWebhooks);

export default router;
