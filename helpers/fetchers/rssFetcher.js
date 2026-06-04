'use strict';

const Parser = require('rss-parser');
const parser = new Parser();

module.exports = async function fetchRss(identifier, lastFetchedAt) {
  const feed = await parser.parseURL(identifier);

  return feed.items
    .filter(item => {
      if (!lastFetchedAt) return true;
      const date = item.isoDate || item.pubDate;
      return date && new Date(date) > new Date(lastFetchedAt);
    })
    .map(item => ({
      externalId: item.guid || item.link,
      title: item.title,
      url: item.link,
      body: item.contentSnippet || item.content || null,
      publishedAt: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null),
    }));
};
