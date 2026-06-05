'use strict';

const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.X_CONSUMER_KEY,
  appSecret: process.env.X_CUNSUMER_KEY_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

const CATEGORY_HASHTAGS = {
  news_intelligence:     '#NextJS #WebDev',
  architecture_insights: '#NextJS #Architecture #WebDev',
  performance_signals:   '#NextJS #Performance #WebDev',
  ecosystem_signals:     '#JavaScript #WebDev #OpenSource',
};

module.exports = async function tweetPost(post) {
  const hashtags = CATEGORY_HASHTAGS[post.category] || '#NextJS #WebDev';
  const text = `${post.headline}\n\n${post.tldr}\n\n${hashtags}`;
  const tweet = text.length > 280 ? text.slice(0, 277) + '...' : text;
  const { data } = await client.v2.tweet(tweet);
  return data.id;
};
