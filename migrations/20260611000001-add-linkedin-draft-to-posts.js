'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'linkedinDraft', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'rejectionReason',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('posts', 'linkedinDraft');
  },
};
