const { Queue } = require('p-queue');
const { openai, claude } = require('./openaiClaudeConfig');  // Your AI integration setup
const queue = new Queue({ concurrency: 1 }); // Adjust concurrency based on your rate limits

async function executeAIQuery(query) {
  return queue.add(async () => {
    // OpenAI example
    const response = await openai.completions.create({
      model: 'text-davinci-003',
      prompt: query,
      max_tokens: 500,
    });

    return response.data.choices[0].text.trim();
  });
}

module.exports = executeAIQuery;