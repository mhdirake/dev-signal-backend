'use strict';

const providerMap = {
  claude: () => require('./providers/claude'),
  openai: () => require('./providers/openai'),
  groq: () => require('./providers/groq'),
};

const providerName = process.env.AI_PROVIDER || 'claude';
const loader = providerMap[providerName];

if (!loader) {
  throw new Error(`Unknown AI_PROVIDER: "${providerName}". Supported: ${Object.keys(providerMap).join(', ')}`);
}

const provider = loader();

module.exports = {
  analyzeContent: provider.analyzeContent,
  call: provider.call,
};
``