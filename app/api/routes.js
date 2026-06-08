const express = require('express');
const fetchChatGPTResponse = require('./ai/openai');
const fetchClaudeResponse = require('./ai/anthropic');
const fetchPageSpeedData = require('./ai/pagespeed');
const router = express.Router();

// Route for Claude (Anthropic) API
router.post('/api/claude', async (req, res) => {
  const { query } = req.body;
  const result = await fetchClaudeResponse(query);
  res.json(result);
});

// Route for OpenAI (ChatGPT) API
router.post('/api/chatgpt', async (req, res) => {
  const { query } = req.body;
  const result = await fetchChatGPTResponse(query);
  res.json(result);
});

// Route for PageSpeed API
router.get('/api/pagespeed', async (req, res) => {
  const { url } = req.query;
  const result = await fetchPageSpeedData(url);
  res.json(result);
});
const fetchGoogleAdsData = require('./ads/adService');

// Route for Google Ads API
router.post('/api/googleads', async (req, res) => {
  const { query } = req.body;
  const result = await fetchGoogleAdsData(query);
  res.json(result);
});

module.exports = router;