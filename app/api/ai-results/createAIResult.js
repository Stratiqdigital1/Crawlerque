const prisma = require('../../lib/prisma');  // Adjust path if necessary

async function storeAIResult(brandName, result) {
  try {
    const aiResult = await prisma.aiResult.create({
      data: {
        brandName,
        result,
      },
    });
    return aiResult;
  } catch (error) {
    console.error('Error storing AI result:', error);
    throw new Error('Error storing AI result');
  }
}

module.exports = storeAIResult;