'use strict';

const axios = require('axios');

module.exports = async function fetchGithubReleases(identifier, lastFetchedAt) {
  const [owner, repo] = identifier.split('/');

  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const { data } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/releases`,
    { headers, params: { per_page: 20 } }
  );

  return data
    .filter(r => !r.draft && !r.prerelease)
    .filter(r => !lastFetchedAt || new Date(r.published_at) > new Date(lastFetchedAt))
    .map(r => ({
      externalId: String(r.id),
      title: `${repo} ${r.tag_name}`,
      url: r.html_url,
      body: r.body || null,
      publishedAt: new Date(r.published_at),
    }));
};
