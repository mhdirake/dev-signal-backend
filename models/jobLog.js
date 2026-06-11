'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JobLog extends Model {
    static associate() {}
  }

  JobLog.init({
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    uuid: { allowNull: false, type: DataTypes.UUID, unique: true, defaultValue: DataTypes.UUIDV4 },
    queue: { allowNull: false, type: DataTypes.STRING(50) },
    job: { allowNull: false, type: DataTypes.STRING(100) },
    status: { allowNull: false, type: DataTypes.ENUM('success', 'failed', 'skipped') },
    summary: { allowNull: false, type: DataTypes.STRING(500) },
    meta: { allowNull: true, type: DataTypes.JSON },
  }, {
    sequelize,
    modelName: 'JobLog',
    tableName: 'job_log',
  });

  return JobLog;
};
