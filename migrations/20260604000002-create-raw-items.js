'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('raw_items', {
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
      sourceId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'sources', key: 'id' },
        onDelete: 'CASCADE',
      },
      externalId: {
        allowNull: false,
        type: Sequelize.STRING,
        comment: 'release ID, article GUID, npm version, etc.',
      },
      title: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      url: {
        allowNull: false,
        type: Sequelize.STRING(2048),
      },
      body: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      publishedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      processed: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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

    await queryInterface.addIndex('raw_items', ['sourceId', 'externalId'], { unique: true });
    await queryInterface.addIndex('raw_items', ['processed']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('raw_items');
  },
};
