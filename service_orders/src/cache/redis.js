const { createClient } = require('redis');

const client = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
    },
});
client.on('error', (err) => console.error('Redis error', err));

async function connectRedis() {
    if (!client.isOpen) await client.connect();
}

async function delByPrefix(prefix) {
    // аккуратно сканим ключи по префиксу и удаляем
    const iter = client.scanIterator({ MATCH: `${prefix}*`, COUNT: 200 });
    for await (const key of iter) {
        await client.del(key);
    }
}

module.exports = { client, connectRedis, delByPrefix };