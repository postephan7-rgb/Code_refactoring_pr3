const Order = require('../models/Order');
const { client, delByPrefix } = require('../cache/redis');
const keys = require('../cache/keys');

const TTL_ORDER = 60;
const TTL_LIST = 30;

/**
 * Приводим модель БД → DTO для API
 */
function toDto(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.userId ?? row.data?.userId ?? null,
        ...(row.data || {}),
    };
}

/**
 * /orders/status
 */
exports.status = (req, res) => {
    res.json({ status: 'Orders service is running' });
};

/**
 * /orders/health
 */
exports.health = (req, res) => {
    res.json({
        status: 'OK',
        service: 'Orders Service',
        timestamp: new Date().toISOString(),
    });
};

/**
 * GET /orders/:orderId
 */
exports.getById = async (req, res) => {
    try {
        const id = Number(req.params.orderId);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid orderId' });
        }

        const cacheKey = keys.order(id);
        const cached = await client.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const row = await Order.findByPk(id);
        if (!row) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const dto = toDto(row);
        await client.setEx(cacheKey, TTL_ORDER, JSON.stringify(dto));

        res.json(dto);
    } catch (e) {
        console.error('orders.getById error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

/**
 * GET /orders?userId=1
 */
exports.getAll = async (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : null;
        if (req.query.userId && !Number.isFinite(userId)) {
            return res.status(400).json({ error: 'Invalid userId in query' });
        }

        const cacheKey = userId ? keys.byUser(userId) : keys.all();
        const cached = await client.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const where = {};
        if (userId) {
            where.userId = userId;
        }

        const rows = await Order.findAll({
            where,
            order: [['id', 'ASC']],
        });

        const result = rows.map(toDto);

        await client.setEx(cacheKey, TTL_LIST, JSON.stringify(result));
        res.json(result);
    } catch (e) {
        console.error('orders.getAll error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

/**
 * POST /orders
 * body: { userId, productId, sum, ... }
 */
exports.create = async (req, res) => {
    try {
        const body = req.body || {};

        const userId = Number(body.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
            return res.status(400).json({ error: 'userId is required (number > 0)' });
        }

        if (body.productId == null) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const row = await Order.create({
            userId,
            data: body,
        });

        await client.del(keys.all());
        await client.del(keys.byUser(userId));

        res.status(201).json(toDto(row));
    } catch (e) {
        console.error('orders.create error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

/**
 * PUT /orders/:orderId
 */
exports.update = async (req, res) => {
    try {
        const id = Number(req.params.orderId);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid orderId' });
        }

        const row = await Order.findByPk(id);
        if (!row) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const body = req.body || {};

        if (body.userId != null) {
            const userId = Number(body.userId);
            if (!Number.isFinite(userId) || userId <= 0) {
                return res.status(400).json({ error: 'userId must be > 0' });
            }
            row.userId = userId;
        }

        row.data = {
            ...(row.data || {}),
            ...body,
        };

        await row.save();

        await client.del(keys.order(id));
        await client.del(keys.all());
        await delByPrefix('orders:user:');

        res.json(toDto(row));
    } catch (e) {
        console.error('orders.update error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

/**
 * DELETE /orders/:orderId
 */
exports.remove = async (req, res) => {
    try {
        const id = Number(req.params.orderId);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid orderId' });
        }

        const row = await Order.findByPk(id);
        if (!row) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const dto = toDto(row);
        await row.destroy();

        await client.del(keys.order(id));
        await client.del(keys.all());
        await delByPrefix('orders:user:');

        res.json({
            message: 'Order deleted',
            deletedOrder: dto,
        });
    } catch (e) {
        console.error('orders.remove error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};