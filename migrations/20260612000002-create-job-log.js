'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('job_log', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: { allowNull: false, type: Sequelize.UUID, unique: true, defaultValue: Sequelize.UUIDV4 },
      queue: { allowNull: false, type: Sequelize.STRING(50) },
      job: { allowNull: false, type: Sequelize.STRING(100) },
      status: { allowNull: false, type: Sequelize.ENUM('success', 'failed', 'skipped') },
      summary: { allowNull: false, type: Sequelize.STRING(500) },
      meta: { allowNull: true, type: Sequelize.JSON },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('job_log');
  },
};
