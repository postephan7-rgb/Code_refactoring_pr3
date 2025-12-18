const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('./db/sequelize');

async function runMigrations() {
    const umzug = new Umzug({
        migrations: { glob: path.join(__dirname, 'migrations', '*.js') },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger: console,
    });

    await umzug.up();
}

module.exports = runMigrations;