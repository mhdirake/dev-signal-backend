'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TokenUsage extends Model {
    static associate() {}
  }

  TokenUsage.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    provider: { allowNull: false, type: DataTypes.STRING(50) },
    model: { allowNull: false, type: DataTypes.STRING(100) },
    feature: { allowNull: false, type: DataTypes.STRING(100) },
    inputTokens: { allowNull: false, type: DataTypes.INTEGER, defaultValue: 0 },
    outputTokens: { allowNull: false, type: DataTypes.INTEGER, defaultValue: 0 },
    costUsd: { allowNull: false, type: DataTypes.DECIMAL(10, 6), defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'TokenUsage',
    tableName: 'token_usage',
  });

  return TokenUsage;
};
