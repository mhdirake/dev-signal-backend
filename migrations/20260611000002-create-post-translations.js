'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('post_translations', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      postId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      locale: { allowNull: false, type: Sequelize.STRING(8) },
      headline: { allowNull: false, type: Sequelize.STRING },
      tldr: { allowNull: false, type: Sequelize.TEXT },
      whyItMatters: { allowNull: false, type: Sequelize.TEXT },
      impactAnalysis: { allowNull: false, type: Sequelize.TEXT },
      recommendedAction: { allowNull: false, type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('post_translations', ['postId', 'locale'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('post_translations');
  },
};
