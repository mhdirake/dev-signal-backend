'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PublishLog extends Model {
    static associate(models) {
      PublishLog.belongsTo(models.Post, { foreignKey: 'postId', as: 'post' });
    }
  }

  PublishLog.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    postId: { allowNull: false, type: DataTypes.INTEGER },
    telegramMessageId: { allowNull: true, type: DataTypes.STRING },
    status: { allowNull: false, type: DataTypes.ENUM('success', 'failed') },
    error: { allowNull: true, type: DataTypes.TEXT },
  }, {
    sequelize,
    modelName: 'PublishLog',
    tableName: 'publish_log',
  });

  return PublishLog;
};
