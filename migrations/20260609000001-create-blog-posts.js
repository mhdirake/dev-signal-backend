'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('blog_posts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: {
        allowNull: false,
        type: Sequelize.UUID,
        unique: true,
        defaultValue: Sequelize.UUIDV4,
      },
      title: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      slug: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true,
      },
      summary: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      content: {
        allowNull: false,
        type: Sequelize.TEXT('long'),
      },
      coverImage: {
        allowNull: true,
        type: Sequelize.STRING(2048),
      },
      tags: {
        allowNull: true,
        type: Sequelize.JSON,
      },
      readTime: {
        allowNull: true,
        type: Sequelize.INTEGER,
        comment: 'Estimated reading time in minutes',
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM('draft', 'published'),
        defaultValue: 'draft',
      },
      publishedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('blog_posts', ['slug']);
    await queryInterface.addIndex('blog_posts', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('blog_posts');
  },
};
