'use strict';

const axios = require('axios');

module.exports = async function fetchNpmVersions(identifier, lastFetchedAt) {
  const { data } = await axios.get(`https://registry.npmjs.org/${identifier}`);
  const { time } = data;

  return Object.keys(time)
    .filter(key => key !== 'created' && key !== 'modified')
    .filter(version => !version.includes('-'))
    .filter(version => {
      if (!lastFetchedAt) return true;
      return new Date(time[version]) > new Date(lastFetchedAt);
    })
    .map(version => ({
      externalId: `${identifier}@${version}`,
      title: `${identifier} v${version}`,
      url: `https://www.npmjs.com/package/${identifier}/v/${version}`,
      body: null,
      publishedAt: new Date(time[version]),
    }));
};
