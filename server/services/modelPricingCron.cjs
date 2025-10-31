/**
 * Model Pricing Cron Job
 * Checks and updates AI model availability and pricing monthly
 */

const cron = require('node-cron');
const tokenTrackingService = require('./tokenTrackingService.cjs');

/**
 * Fetch latest OpenAI model pricing
 * In production, this would call OpenAI's API or scrape their pricing page
 */
async function fetchOpenAIPricing() {
  // TODO: Implement actual API call to OpenAI pricing endpoint
  // For now, returning hardcoded latest pricing (as of Oct 2024)
  
  console.log('Fetching OpenAI model pricing...');
  
  return [
    { name: 'gpt-4-turbo', label: 'GPT-4 Turbo', input: 10.00, output: 30.00, available: true },
    { name: 'gpt-4', label: 'GPT-4', input: 30.00, output: 60.00, available: true },
    { name: 'gpt-4o', label: 'GPT-4o', input: 5.00, output: 15.00, available: true },
    { name: 'gpt-4o-mini', label: 'GPT-4o Mini', input: 0.15, output: 0.60, available: true },
    { name: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', input: 0.50, output: 1.50, available: true },
  ];
}

/**
 * Fetch latest Gemini model pricing
 * In production, this would call Google's API or scrape their pricing page
 */
async function fetchGeminiPricing() {
  // TODO: Implement actual API call to Google Gemini pricing endpoint
  // For now, returning hardcoded latest pricing (as of Oct 2024)
  
  console.log('Fetching Gemini model pricing...');
  
  return [
    { name: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', input: 3.50, output: 10.50, available: true },
    { name: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', input: 0.35, output: 1.05, available: true },
    { name: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro', input: 0.50, output: 1.50, available: true },
    { name: 'gemini-pro', label: 'Gemini Pro', input: 0.50, output: 1.50, available: true },
  ];
}

/**
 * Update all model pricing in database
 */
async function updateAllModelPricing() {
  console.log('🔄 Starting monthly model pricing update...');
  
  try {
    // Fetch OpenAI pricing
    const openaiModels = await fetchOpenAIPricing();
    for (const model of openaiModels) {
      await tokenTrackingService.updateModelPricing({
        modelProvider: 'openai',
        modelName: model.name,
        modelLabel: model.label,
        inputPrice: model.input,
        outputPrice: model.output,
        isAvailable: model.available ? 1 : 0
      });
      console.log(`✓ Updated OpenAI model: ${model.label}`);
    }
    
    // Fetch Gemini pricing
    const geminiModels = await fetchGeminiPricing();
    for (const model of geminiModels) {
      await tokenTrackingService.updateModelPricing({
        modelProvider: 'gemini',
        modelName: model.name,
        modelLabel: model.label,
        inputPrice: model.input,
        outputPrice: model.output,
        isAvailable: model.available ? 1 : 0
      });
      console.log(`✓ Updated Gemini model: ${model.label}`);
    }
    
    console.log('✅ Monthly model pricing update completed successfully');
  } catch (error) {
    console.error('❌ Error updating model pricing:', error);
  }
}

/**
 * Initialize cron job
 * Runs on the 1st of every month at 2:00 AM
 */
function initializeModelPricingCron() {
  // Run on the 1st of every month at 2:00 AM
  // Cron format: minute hour day-of-month month day-of-week
  const cronSchedule = '0 2 1 * *';
  
  cron.schedule(cronSchedule, () => {
    console.log('🕐 Model pricing cron job triggered');
    updateAllModelPricing();
  });
  
  console.log('✅ Model pricing cron job initialized (runs monthly on 1st at 2:00 AM)');
  
  // Optionally run immediately on startup (comment out in production)
  // updateAllModelPricing();
}

/**
 * Manual trigger for testing
 */
function triggerManualUpdate() {
  console.log('🔧 Manual model pricing update triggered');
  return updateAllModelPricing();
}

module.exports = {
  initializeModelPricingCron,
  triggerManualUpdate,
  updateAllModelPricing
};
