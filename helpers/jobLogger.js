'use strict';

module.exports = function logJob({ queue, job, status, summary, meta = {} }) {
  require('@models').JobLog.create({ queue, job, status, summary, meta })
    .catch(err => console.error('[jobLogger] failed:', err.message));
};
