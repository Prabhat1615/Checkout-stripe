const express = require('express');
const { createCheckoutSession, sessionStatus } = require('../controllers/checkoutController');
const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
router.get('/session-status', sessionStatus);

module.exports = router;
