'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    static associate(models) {
      Post.belongsTo(models.RawItem, { foreignKey: 'rawItemId', as: 'rawItem' });
      Post.hasMany(models.PublishLog, { foreignKey: 'postId', as: 'publishLogs' });
      Post.hasMany(models.PostTranslation, { foreignKey: 'postId', as: 'translations' });
    }
  }

  Post.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    rawItemId: { allowNull: true, type: DataTypes.INTEGER },
    category: {
      allowNull: false,
      type: DataTypes.ENUM(
        'news_intelligence',
        'architecture_insights',
        'performance_signals',
        'ecosystem_signals'
      ),
    },
    relevanceScore: { allowNull: true, type: DataTypes.DECIMAL(4, 3) },
    headline: { allowNull: false, type: DataTypes.STRING },
    tldr: { allowNull: false, type: DataTypes.TEXT },
    whyItMatters: { allowNull: false, type: DataTypes.TEXT },
    impactAnalysis: { allowNull: false, type: DataTypes.TEXT },
    recommendedAction: { allowNull: false, type: DataTypes.TEXT },
    sourceUrl: { allowNull: false, type: DataTypes.STRING(2048) },
    coverImage: { allowNull: true, type: DataTypes.STRING(2048) },
    status: {
      allowNull: false,
      type: DataTypes.ENUM('pending', 'approved', 'scheduled', 'published', 'rejected'),
      defaultValue: 'pending',
    },
    scheduledAt: { allowNull: true, type: DataTypes.DATE },
    publishedAt: { allowNull: true, type: DataTypes.DATE },
    telegramMessageId: { allowNull: true, type: DataTypes.STRING },
    rejectionReason: { allowNull: true, type: DataTypes.TEXT },
    linkedinDraft: { allowNull: true, type: DataTypes.TEXT },
  }, {
    sequelize,
    modelName: 'Post',
    tableName: 'posts',
  });

  return Post;
};
