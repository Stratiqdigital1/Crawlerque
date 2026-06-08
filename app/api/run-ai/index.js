const getBrandNameFromDomain = require('../ai/domainParser');
const generateAIQuery = require('../prompts/generateAIQuery');
const executeAIQuery = require('../ai/aiQueryExecutor');
const storeAIResult = require('../ai-results/createAIResult');

async function runAI(req, res) {
  const { domain } = req.body;
  
  const brandName = getBrandNameFromDomain(domain);
  const query = generateAIQuery(brandName);

  try {
    const result = await executeAIQuery(query);
    
    // Store result in the database
    const aiResult = await storeAIResult(brandName, result);
    
    res.status(200).json(aiResult);
  } catch (error) {
    console.error('Error executing AI query:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

module.exports = runAI;