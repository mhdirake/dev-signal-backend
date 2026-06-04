'use strict';

const providers = {
  claude: () => require('./providers/claude'),
  openai: () => require('./providers/openai'),
  groq: () => require('./providers/groq'),
};

const providerName = process.env.AI_PROVIDER || 'claude';
const provider = providers[providerName];

if (!provider) {
  throw new Error(`Unknown AI_PROVIDER: "${providerName}". Supported: ${Object.keys(providers).join(', ')}`);
}

module.exports = { analyzeContent: provider() };
``