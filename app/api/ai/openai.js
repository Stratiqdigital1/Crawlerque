const axios = require('axios');

const fetchChatGPTResponse = async (query) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: "gpt-3.5-turbo",  // Or another model you use
        prompt: query,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return null;
  }
};

module.exports = fetchChatGPTResponse;