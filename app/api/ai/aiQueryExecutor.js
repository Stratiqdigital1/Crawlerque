const { Queue } = require('p-queue');
const { openai, claude } = require('../ai/openaiClaudeConfig');  // Adjust path based on actual integration
const queue = new Queue({ concurrency: 1 });

async function executeAIQuery(query) {
  return queue.add(async () => {
    const response = await openai.completions.create({
      model: 'text-davinci-003',
      prompt: query,
      max_tokens: 500,
    });

    return response.data.choices[0].text.trim();
  });
}

module.exports = executeAIQuery;