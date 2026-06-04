'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Source extends Model {
    static associate(models) {
      Source.hasMany(models.RawItem, { foreignKey: 'sourceId', as: 'rawItems' });
    }
  }

  Source.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    type: { allowNull: false, type: DataTypes.ENUM('github_release', 'rss', 'npm') },
    name: { allowNull: false, type: DataTypes.STRING },
    identifier: { allowNull: false, type: DataTypes.STRING },
    active: { allowNull: false, type: DataTypes.BOOLEAN, defaultValue: true },
    lastFetchedAt: { allowNull: true, type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'Source',
    tableName: 'sources',
  });

  return Source;
};
