'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('raw_items', 'imageUrl', {
      type: Sequelize.STRING(2048),
      allowNull: true,
      after: 'body',
    });
    await queryInterface.addColumn('posts', 'coverImage', {
      type: Sequelize.STRING(2048),
      allowNull: true,
      after: 'sourceUrl',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('raw_items', 'imageUrl');
    await queryInterface.removeColumn('posts', 'coverImage');
  },
};
