const axios = require('axios');

const fetchPageSpeedData = async (url) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=${process.env.PAGESPEED_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error('Error with PageSpeed API:', error);
    return null;
  }
};

module.exports = fetchPageSpeedData;