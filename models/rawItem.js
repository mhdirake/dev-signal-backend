'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RawItem extends Model {
    static associate(models) {
      RawItem.belongsTo(models.Source, { foreignKey: 'sourceId', as: 'source' });
      RawItem.hasOne(models.Post, { foreignKey: 'rawItemId', as: 'post' });
    }
  }

  RawItem.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    sourceId: { allowNull: false, type: DataTypes.INTEGER },
    externalId: { allowNull: false, type: DataTypes.STRING },
    title: { allowNull: false, type: DataTypes.STRING },
    url: { allowNull: false, type: DataTypes.STRING(2048) },
    body: { allowNull: true, type: DataTypes.TEXT },
    imageUrl: { allowNull: true, type: DataTypes.STRING(2048) },
    publishedAt: { allowNull: true, type: DataTypes.DATE },
    processed: { allowNull: false, type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    sequelize,
    modelName: 'RawItem',
    tableName: 'raw_items',
  });

  return RawItem;
};
