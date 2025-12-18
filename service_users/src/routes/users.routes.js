const router = require('express').Router();
const c = require('../controllers/users.controller');

router.get('/users/health', c.health);
router.get('/users/status', c.status);

router.get('/users', c.getAll);
router.post('/users', c.create);
router.get('/users/:userId', c.getById);
router.put('/users/:userId', c.update);
router.delete('/users/:userId', c.remove);

module.exports = router;