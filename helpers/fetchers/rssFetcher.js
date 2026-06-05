'use strict';

const Parser = require('rss-parser');
const parser = new Parser();

module.exports = async function fetchRss(identifier, lastFetchedAt) {
  const feed = await parser.parseURL(identifier);

  const since = lastFetchedAt
    ? new Date(lastFetchedAt)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return feed.items
    .filter(item => {
      const date = item.isoDate || item.pubDate;
      return date && new Date(date) > since;
    })
    .map(item => ({
      externalId: item.guid || item.link,
      title: item.title,
      url: item.link,
      body: item.contentSnippet || item.content || null,
      publishedAt: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null),
    }));
};
