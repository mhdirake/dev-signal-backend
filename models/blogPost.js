'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogPost extends Model {
    static associate() {}
  }

  BlogPost.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    title: { allowNull: false, type: DataTypes.STRING },
    slug: { allowNull: false, type: DataTypes.STRING, unique: true },
    summary: { allowNull: true, type: DataTypes.TEXT },
    content: { allowNull: false, type: DataTypes.TEXT('long') },
    coverImage: { allowNull: true, type: DataTypes.STRING(2048) },
    tags: { allowNull: true, type: DataTypes.JSON },
    readTime: { allowNull: true, type: DataTypes.INTEGER },
    status: {
      allowNull: false,
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft',
    },
    publishedAt: { allowNull: true, type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'BlogPost',
    tableName: 'blog_posts',
  });

  return BlogPost;
};
