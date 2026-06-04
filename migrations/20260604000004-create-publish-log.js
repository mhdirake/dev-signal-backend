'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('publish_log', {
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
      postId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
      },
      telegramMessageId: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM('success', 'failed'),
      },
      error: {
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

    await queryInterface.addIndex('publish_log', ['postId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('publish_log');
  },
};
