const app = require('./app');
const sequelize = require('./db/sequelize');
const runMigrations = require('./migrate');
const { connectRedis } = require('./cache/redis');

const PORT = process.env.PORT || 8000;

async function waitDb() {
    for (let i = 0; i < 30; i++) {
        try {
            await sequelize.authenticate();
            return;
        } catch {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error('DB not ready');
}

(async () => {
    await connectRedis();
    await waitDb();
    await runMigrations();

    app.listen(PORT, '0.0.0.0', () => console.log(`Reviews service running on port ${PORT}`));
})();