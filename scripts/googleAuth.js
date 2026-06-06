'use strict';

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:4242',
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent',
});

console.log('\n🔗 این لینک رو توی مرورگر باز کن:\n');
console.log(authUrl);
console.log('\n⏳ منتظر callback...\n');

const server = http.createServer(async (req, res) => {
  const { query } = url.parse(req.url, true);

  if (!query.code) {
    res.end('❌ کد پیدا نشد.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(query.code);
    res.end('<h2>✅ موفق! برگرد به ترمینال.</h2>');
    server.close();
    console.log('\n✅ موفق! این مقدار رو به .env اضافه کن:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n');
  } catch (err) {
    res.end(`<h2>❌ خطا: ${err.message}</h2>`);
    server.close();
    console.error('❌ خطا:', err.message);
  }
});

server.listen(4242);
