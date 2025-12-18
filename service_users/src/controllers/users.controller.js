const User = require('../models/User');
const { client } = require('../cache/redis');
const keys = require('../cache/keys');

const TTL_USER = 60;
const TTL_ALL = 30;

function toDto(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        ...(row.data || {}),
    };
}

exports.health = (req, res) => {
    res.json({ status: 'OK', service: 'Users Service', timestamp: new Date().toISOString() });
};

exports.status = (req, res) => res.json({ status: 'Users service is running' });

exports.getAll = async (req, res) => {
    try {
        const cacheKey = keys.all();
        const cached = await client.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const rows = await User.findAll({ order: [['id', 'ASC']] });
        const result = rows.map(toDto);

        await client.setEx(cacheKey, TTL_ALL, JSON.stringify(result));
        res.json(result);
    } catch (e) {
        console.error('users.getAll error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = Number(req.params.userId);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid userId' });

        const cacheKey = keys.user(id);
        const cached = await client.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const row = await User.findByPk(id);
        if (!row) return res.status(404).json({ error: 'User not found' });

        const dto = toDto(row);
        await client.setEx(cacheKey, TTL_USER, JSON.stringify(dto));
        res.json(dto);
    } catch (e) {
        console.error('users.getById error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

exports.create = async (req, res) => {
    try {
        const body = req.body || {};
        const name = body.name;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'name is required (non-empty string)' });
        }

        const row = await User.create({
            name: name.trim(),
            data: body,
        });

        await client.del(keys.all());
        res.status(201).json(toDto(row));
    } catch (e) {
        console.error('users.create error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

exports.update = async (req, res) => {
    try {
        const id = Number(req.params.userId);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid userId' });

        const row = await User.findByPk(id);
        if (!row) return res.status(404).json({ error: 'User not found' });

        const body = req.body || {};

        if (body.name != null) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return res.status(400).json({ error: 'name must be non-empty string' });
            }
            row.name = body.name.trim();
        }

        row.data = { ...(row.data || {}), ...body };
        await row.save();

        await client.del(keys.user(id));
        await client.del(keys.all());

        res.json(toDto(row));
    } catch (e) {
        console.error('users.update error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};

exports.remove = async (req, res) => {
    try {
        const id = Number(req.params.userId);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid userId' });

        const row = await User.findByPk(id);
        if (!row) return res.status(404).json({ error: 'User not found' });

        const dto = toDto(row);
        await row.destroy();

        await client.del(keys.user(id));
        await client.del(keys.all());

        res.json({ message: 'User deleted', deletedUser: dto });
    } catch (e) {
        console.error('users.remove error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
};