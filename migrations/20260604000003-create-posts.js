'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('posts', {
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
      rawItemId: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: { model: 'raw_items', key: 'id' },
        onDelete: 'SET NULL',
      },
      category: {
        allowNull: false,
        type: Sequelize.ENUM(
          'news_intelligence',
          'architecture_insights',
          'performance_signals',
          'ecosystem_signals'
        ),
      },
      relevanceScore: {
        allowNull: true,
        type: Sequelize.DECIMAL(4, 3),
        comment: '0.000 – 1.000, assigned by Claude',
      },
      headline: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      tldr: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      whyItMatters: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      impactAnalysis: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      recommendedAction: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      sourceUrl: {
        allowNull: false,
        type: Sequelize.STRING(2048),
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM('pending', 'approved', 'scheduled', 'published', 'rejected'),
        defaultValue: 'pending',
      },
      scheduledAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      publishedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      telegramMessageId: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      rejectionReason: {
        allowNull: true,
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('posts', ['status']);
    await queryInterface.addIndex('posts', ['scheduledAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('posts');
  },
};
