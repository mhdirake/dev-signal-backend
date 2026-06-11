'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('token_usage', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: { allowNull: false, type: Sequelize.UUID, unique: true, defaultValue: Sequelize.UUIDV4 },
      provider: { allowNull: false, type: Sequelize.STRING(50) },
      model: { allowNull: false, type: Sequelize.STRING(100) },
      feature: { allowNull: false, type: Sequelize.STRING(100) },
      inputTokens: { allowNull: false, type: Sequelize.INTEGER, defaultValue: 0 },
      outputTokens: { allowNull: false, type: Sequelize.INTEGER, defaultValue: 0 },
      costUsd: { allowNull: false, type: Sequelize.DECIMAL(10, 6), defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('token_usage');
  },
};
