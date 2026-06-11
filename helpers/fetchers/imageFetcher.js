'use strict';

const axios = require('axios');

module.exports = async function fetchOgImage(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DevSignal/1.0)',
        Accept: 'text/html',
      },
      maxContentLength: 500_000,
      responseType: 'text',
    });

    const match =
      data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return match ? match[1] : null;
  } catch {
    return null;
  }
};
