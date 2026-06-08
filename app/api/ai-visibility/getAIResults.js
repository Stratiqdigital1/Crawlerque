const prisma = require('../../lib/prisma');  // Adjust path if necessary

async function getAIResults(req, res) {
  try {
    const results = await prisma.aiResult.findMany();
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching AI results:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

module.exports = getAIResults;