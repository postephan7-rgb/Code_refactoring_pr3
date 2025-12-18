const router = require('express').Router();
const c = require('../controllers/orders.controller');

router.get('/orders/status', c.status);
router.get('/orders/health', c.health);

router.get('/orders', c.getAll);
router.post('/orders', c.create);
router.get('/orders/:orderId', c.getById);
router.put('/orders/:orderId', c.update);
router.delete('/orders/:orderId', c.remove);

module.exports = router;