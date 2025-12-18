const router = require('express').Router();
const c = require('../controllers/reviews.controller');

router.get('/reviews/status', c.status);
router.get('/reviews/health', c.health);

router.get('/reviews', c.getAll);
router.post('/reviews', c.create);
router.get('/reviews/:reviewId', c.getById);
router.put('/reviews/:reviewId', c.update);
router.delete('/reviews/:reviewId', c.remove);

router.get('/reviews/product/:productId/average', c.avgByProduct);

module.exports = router;