const axios = require('axios');

const fetchClaudeResponse = async (query) => {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/claude-chat',  // Replace with the correct Anthropic endpoint
      {
        prompt: query,
        model: "claude-v2",  // Or other Claude models
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error with Anthropic API:', error);
    return null;
  }
};

module.exports = fetchClaudeResponse;