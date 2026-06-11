'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PostTranslation extends Model {
    static associate(models) {
      PostTranslation.belongsTo(models.Post, { foreignKey: 'postId', as: 'post' });
    }
  }

  PostTranslation.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    postId: { allowNull: false, type: DataTypes.INTEGER },
    locale: { allowNull: false, type: DataTypes.STRING(8) },
    headline: { allowNull: false, type: DataTypes.STRING },
    tldr: { allowNull: false, type: DataTypes.TEXT },
    whyItMatters: { allowNull: false, type: DataTypes.TEXT },
    impactAnalysis: { allowNull: false, type: DataTypes.TEXT },
    recommendedAction: { allowNull: false, type: DataTypes.TEXT },
  }, {
    sequelize,
    modelName: 'PostTranslation',
    tableName: 'post_translations',
    indexes: [{ unique: true, fields: ['postId', 'locale'] }],
  });

  return PostTranslation;
};
