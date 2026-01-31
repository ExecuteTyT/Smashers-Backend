/**
 * Routes Aggregator
 *
 * Combines all route modules.
 */

const express = require('express');
const apiRoutes = require('./api.routes');

const router = express.Router();

// Mount API routes
router.use('/api', apiRoutes);

// Root redirect to health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smashers Backend API',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

module.exports = router;
