const axios = require('axios');
const Review = require('../models/Review');
const { client } = require('../cache/redis');
const keys = require('../cache/keys');

const ORDERS_URL = process.env.ORDERS_SERVICE_URL || 'http://service_orders:8000';

const TTL_REVIEW = 60;
const TTL_AVG = 30;

function isInt(n) {
    return Number.isInteger(n) && !Number.isNaN(n);
}

exports.status = (req, res) => res.json({ status: 'Reviews service is running' });

exports.health = (req, res) => {
    res.json({ status: 'OK', service: 'Reviews Service', timestamp: new Date().toISOString() });
};

exports.getAll = async (req, res) => {
    const where = {};
    if (req.query.orderId) where.orderId = Number(req.query.orderId);
    if (req.query.productId) where.productId = Number(req.query.productId);

    const rows = await Review.findAll({ where, order: [['id', 'ASC']] });
    res.json(rows);
};

exports.getById = async (req, res) => {
    const id = Number(req.params.reviewId);
    const cacheKey = keys.review(id);

    const cached = await client.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const row = await Review.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Review not found' });

    await client.setEx(cacheKey, TTL_REVIEW, JSON.stringify(row));
    res.json(row);
};

exports.create = async (req, res) => {
    const { orderId, rating, comment } = req.body || {};
    const oid = Number(orderId);
    const r = Number(rating);

    if (!isInt(oid)) return res.status(400).json({ error: 'orderId must be an integer' });
    if (!isInt(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating must be an integer 1..5' });

    // Проверка существования отзыва до создания
    const exists = await Review.findOne({ where: { orderId: oid } });
    if (exists) return res.status(409).json({ error: 'Review already exists for this order' });

    // (Полезно) проверим, что заказ существует и достанем productId
    let order;
    try {
        const resp = await axios.get(`${ORDERS_URL}/orders/${oid}`, { validateStatus: () => true });
        if (resp.status === 404) return res.status(404).json({ error: 'Order not found' });
        if (resp.status < 200 || resp.status >= 300) return res.status(502).json({ error: 'Orders service error' });
        order = resp.data;
    } catch {
        return res.status(502).json({ error: 'Orders service unavailable' });
    }

    const productId =
        (order && isInt(Number(order.productId)) ? Number(order.productId) : null) ??
        (order && order.productId != null ? Number(order.productId) : null) ??
        (order && order.data && order.data.productId != null ? Number(order.data.productId) : null);

    if (!isInt(productId)) {
        return res.status(400).json({ error: 'Cannot determine productId from order (need order.productId or order.data.productId)' });
    }

    const row = await Review.create({ orderId: oid, productId, rating: r, comment: comment ?? null });

    // Инвалидируем кэш
    await client.del(keys.byOrder(oid));
    await client.del(keys.avgByProduct(productId));

    res.status(201).json(row);
};

exports.update = async (req, res) => {
    const id = Number(req.params.reviewId);
    const row = await Review.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Review not found' });

    if (req.body.rating != null) {
        const r = Number(req.body.rating);
        if (!isInt(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating must be an integer 1..5' });
        row.rating = r;
    }
    if (req.body.comment !== undefined) row.comment = req.body.comment;

    await row.save();

    await client.del(keys.review(id));
    await client.del(keys.byOrder(row.orderId));
    await client.del(keys.avgByProduct(row.productId));

    res.json(row);
};

exports.remove = async (req, res) => {
    const id = Number(req.params.reviewId);
    const row = await Review.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Review not found' });

    const { orderId, productId } = row;

    await row.destroy();

    await client.del(keys.review(id));
    await client.del(keys.byOrder(orderId));
    await client.del(keys.avgByProduct(productId));

    res.json({ message: 'Review deleted', deletedReview: row });
};

exports.avgByProduct = async (req, res) => {
    const productId = Number(req.params.productId);
    if (!isInt(productId)) return res.status(400).json({ error: 'productId must be an integer' });

    const cacheKey = keys.avgByProduct(productId);
    const cached = await client.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const rows = await Review.findAll({ where: { productId } });
    const count = rows.length;
    const avg = count === 0 ? 0 : rows.reduce((s, x) => s + x.rating, 0) / count;

    const result = { productId, averageRating: Number(avg.toFixed(2)), count };
    await client.setEx(cacheKey, TTL_AVG, JSON.stringify(result));

    res.json(result);
};