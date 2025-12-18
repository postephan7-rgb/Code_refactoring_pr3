const express = require('express');
const cors = require('cors');
const axios = require('axios');
const CircuitBreaker = require('opossum');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const USERS_SERVICE_URL = 'http://service_users:8000';
const ORDERS_SERVICE_URL = 'http://service_orders:8000';
const REVIEWS_SERVICE_URL = 'http://service_reviews:8000';

const circuitOptions = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 3000,
};

function makeBreaker() {
    const breaker = new CircuitBreaker(async (url, options = {}) => {
        try {
            const response = await axios({
                url,
                ...options,
                validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) return error.response.data;
            throw error;
        }
    }, circuitOptions);
    return breaker;
}

const usersCircuit = makeBreaker();
const ordersCircuit = makeBreaker();
const reviewsCircuit = makeBreaker();

usersCircuit.fallback(() => ({ error: 'Users service temporarily unavailable' }));
ordersCircuit.fallback(() => ({ error: 'Orders service temporarily unavailable' }));
reviewsCircuit.fallback(() => ({ error: 'Reviews service temporarily unavailable' }));

// USERS (как было)
app.get('/users/:userId', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`);
        if (user.error === 'User not found') res.status(404).json(user);
        else res.json(user);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/users', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users`, { method: 'POST', data: req.body });
        res.status(201).json(user);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await usersCircuit.fire(`${USERS_SERVICE_URL}/users`);
        res.json(users);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/users/:userId', async (req, res) => {
    try {
        const result = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`, { method: 'DELETE' });
        res.json(result);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/users/:userId', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`, {
            method: 'PUT',
            data: req.body,
        });
        res.json(user);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ORDERS (как было)
app.get('/orders/:orderId', async (req, res) => {
    try {
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/${req.params.orderId}`);
        if (order.error === 'Order not found') res.status(404).json(order);
        else res.json(order);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders`, { method: 'POST', data: req.body });
        res.status(201).json(order);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/orders', async (req, res) => {
    try {
        const orders = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders`);
        res.json(orders);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/orders/:orderId', async (req, res) => {
    try {
        const result = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/${req.params.orderId}`, { method: 'DELETE' });
        res.json(result);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/orders/:orderId', async (req, res) => {
    try {
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/${req.params.orderId}`, {
            method: 'PUT',
            data: req.body,
        });
        res.json(order);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/orders/status', async (req, res) => {
    try {
        const status = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/status`);
        res.json(status);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/orders/health', async (req, res) => {
    try {
        const health = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/health`);
        res.json(health);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// REVIEWS (новое)
app.get('/reviews/status', async (req, res) => {
    try {
        const status = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews/status`);
        res.json(status);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/reviews/health', async (req, res) => {
    try {
        const health = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews/health`);
        res.json(health);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/reviews', async (req, res) => {
    try {
        const qs = new URLSearchParams(req.query).toString();
        const data = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews${qs ? `?${qs}` : ''}`);
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/reviews', async (req, res) => {
    try {
        const data = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews`, { method: 'POST', data: req.body });
        // reviews сам вернет 409/404/400, но через CB мы не ловим статус. Для простоты тут 201:
        res.status(201).json(data);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/reviews/:reviewId', async (req, res) => {
    try {
        const data = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews/${req.params.reviewId}`);
        if (data.error === 'Review not found') res.status(404).json(data);
        else res.json(data);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/reviews/:reviewId', async (req, res) => {
    try {
        const data = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews/${req.params.reviewId}`, {
            method: 'PUT',
            data: req.body,
        });
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/reviews/:reviewId', async (req, res) => {
    try {
        const data = await reviewsCircuit.fire(`${REVIEWS_SERVICE_URL}/reviews/${req.params.reviewId}`, { method: 'DELETE' });
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/reviews/product/:productId/average', async (req, res) => {
    try {
        const data = await reviewsCircuit.fire(
            `${REVIEWS_SERVICE_URL}/reviews/product/${req.params.productId}/average`
        );
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// aggregation: user + его заказы (как было)
app.get('/users/:userId/details', async (req, res) => {
    try {
        const userId = req.params.userId;

        const userPromise = usersCircuit.fire(`${USERS_SERVICE_URL}/users/${userId}`);
        const ordersPromise = ordersCircuit
            .fire(`${ORDERS_SERVICE_URL}/orders`)
            .then((orders) => orders.filter((order) => order.userId == userId));

        const [user, userOrders] = await Promise.all([userPromise, ordersPromise]);

        if (user.error === 'User not found') return res.status(404).json(user);

        res.json({ user, orders: userOrders });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'API Gateway is running',
        circuits: {
            users: { status: usersCircuit.status, stats: usersCircuit.stats },
            orders: { status: ordersCircuit.status, stats: ordersCircuit.stats },
            reviews: { status: reviewsCircuit.status, stats: reviewsCircuit.stats },
        },
    });
});

app.get('/status', (req, res) => res.json({ status: 'API Gateway is running' }));

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    usersCircuit.on('open', () => console.log('Users circuit breaker opened'));
    usersCircuit.on('close', () => console.log('Users circuit breaker closed'));
    usersCircuit.on('halfOpen', () => console.log('Users circuit breaker half-open'));

    ordersCircuit.on('open', () => console.log('Orders circuit breaker opened'));
    ordersCircuit.on('close', () => console.log('Orders circuit breaker closed'));
    ordersCircuit.on('halfOpen', () => console.log('Orders circuit breaker half-open'));

    reviewsCircuit.on('open', () => console.log('Reviews circuit breaker opened'));
    reviewsCircuit.on('close', () => console.log('Reviews circuit breaker closed'));
    reviewsCircuit.on('halfOpen', () => console.log('Reviews circuit breaker half-open'));
});