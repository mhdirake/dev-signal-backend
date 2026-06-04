'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sources', {
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
      type: {
        allowNull: false,
        type: Sequelize.ENUM('github_release', 'rss', 'npm'),
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      identifier: {
        allowNull: false,
        type: Sequelize.STRING,
        comment: 'repo "vercel/next.js", feed URL, or npm package name',
      },
      active: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastFetchedAt: {
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

    await queryInterface.addIndex('sources', ['identifier', 'type'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sources');
  },
};
