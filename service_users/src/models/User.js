const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const User = sequelize.define(
    'User',
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        data: { type: DataTypes.JSONB, allowNull: true },
    },
    {
        tableName: 'users',
        timestamps: true,
    }
);

module.exports = User;