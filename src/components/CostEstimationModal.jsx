import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';

const CostEstimationModal = ({ isOpen, onClose, models }) => {
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    if (models && models[selectedProvider] && models[selectedProvider].length > 0) {
      setSelectedModel(models[selectedProvider][0].model_name);
    }
  }, [selectedProvider, models]);

  if (!isOpen) return null;

  // Estimated token usage for different operations
  const OPERATION_ESTIMATES = {
    plan_4week: {
      name: '4-Week Training Plan',
      promptTokens: 2000,
      completionTokens: 3500,
      description: 'Generate a new 4-week training plan from scratch'
    },
    plan_6week: {
      name: '6-Week Training Plan',
      promptTokens: 2000,
      completionTokens: 5000,
      description: 'Generate a new 6-week training plan from scratch'
    },
    plan_adjustment: {
      name: 'Plan Adjustment',
      promptTokens: 3000,
      completionTokens: 4000,
      description: 'Adjust existing plan based on athlete feedback'
    },
    workout_analysis: {
      name: 'Workout Analysis',
      promptTokens: 1500,
      completionTokens: 500,
      description: 'Analyze completed workout vs planned session'
    },
    race_analysis: {
      name: 'Race Analysis',
      promptTokens: 2500,
      completionTokens: 1500,
      description: 'Complete post-race performance analysis'
    },
  };

  const calculateCost = (operation, modelData) => {
    if (!modelData) return 0;
    
    const inputCost = (operation.promptTokens / 1000000) * modelData.input_price_per_1m;
    const outputCost = (operation.completionTokens / 1000000) * modelData.output_price_per_1m;
    
    return (inputCost + outputCost).toFixed(4);
  };

  const currentModel = models?.[selectedProvider]?.find(m => m.model_name === selectedModel);

  const getProviderColor = (provider) => {
    return provider === 'openai' 
      ? 'from-green-500 to-green-600' 
      : 'from-purple-500 to-purple-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Cost Estimation Calculator</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Approximate costs per operation based on current model pricing
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select AI Provider
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProvider('openai')}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  selectedProvider === 'openai'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="font-semibold text-gray-900">ChatGPT (OpenAI)</div>
                <div className="text-xs text-gray-600 mt-1">
                  {models?.openai?.length || 0} models available
                </div>
              </button>
              <button
                onClick={() => setSelectedProvider('gemini')}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  selectedProvider === 'gemini'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Gemini (Google)</div>
                <div className="text-xs text-gray-600 mt-1">
                  {models?.gemini?.length || 0} models available
                </div>
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {models?.[selectedProvider]?.map((model) => (
                <option key={model.model_name} value={model.model_name}>
                  {model.model_label} - ${model.input_price_per_1m}/M input, ${model.output_price_per_1m}/M output
                </option>
              ))}
            </select>
          </div>

          {/* Current Model Pricing Info */}
          {currentModel && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>{currentModel.model_label}</strong> pricing: 
                  ${currentModel.input_price_per_1m} per 1M input tokens, 
                  ${currentModel.output_price_per_1m} per 1M output tokens
                </div>
              </div>
            </div>
          )}

          {/* Cost Estimates Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Estimated Costs Per Operation
            </h3>
            <div className="space-y-3">
              {Object.entries(OPERATION_ESTIMATES).map(([key, operation]) => (
                <div
                  key={key}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{operation.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{operation.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${currentModel ? calculateCost(operation, currentModel) : '0.0000'}
                      </div>
                      <div className="text-xs text-gray-500">per operation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                    <span>📥 {operation.promptTokens.toLocaleString()} input tokens</span>
                    <span>📤 {operation.completionTokens.toLocaleString()} output tokens</span>
                    <span>Σ {(operation.promptTokens + operation.completionTokens).toLocaleString()} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume Estimates */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Monthly Volume Estimates
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">100 Training Plans/month</div>
                <div className="text-xs text-gray-600 mt-1">
                  (50 × 4-week + 50 × 6-week)
                </div>
                <div className="text-lg font-bold text-purple-600 mt-2">
                  ${currentModel ? (
                    (50 * parseFloat(calculateCost(OPERATION_ESTIMATES.plan_4week, currentModel)) +
                     50 * parseFloat(calculateCost(OPERATION_ESTIMATES.plan_6week, currentModel)))
                  ).toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">200 Plan Adjustments/month</div>
                <div className="text-xs text-gray-600 mt-1">
                  Average athlete modifications
                </div>
                <div className="text-lg font-bold text-purple-600 mt-2">
                  ${currentModel ? (
                    200 * parseFloat(calculateCost(OPERATION_ESTIMATES.plan_adjustment, currentModel))
                  ).toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">500 Workout Analyses/month</div>
                <div className="text-xs text-gray-600 mt-1">
                  Post-workout AI feedback
                </div>
                <div className="text-lg font-bold text-purple-600 mt-2">
                  ${currentModel ? (
                    500 * parseFloat(calculateCost(OPERATION_ESTIMATES.workout_analysis, currentModel))
                  ).toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">50 Race Analyses/month</div>
                <div className="text-xs text-gray-600 mt-1">
                  Post-race performance reviews
                </div>
                <div className="text-lg font-bold text-purple-600 mt-2">
                  ${currentModel ? (
                    50 * parseFloat(calculateCost(OPERATION_ESTIMATES.race_analysis, currentModel))
                  ).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total Estimated Monthly Cost:</span>
                <span className="text-2xl font-bold text-purple-600">
                  ${currentModel ? (
                    (50 * parseFloat(calculateCost(OPERATION_ESTIMATES.plan_4week, currentModel)) +
                     50 * parseFloat(calculateCost(OPERATION_ESTIMATES.plan_6week, currentModel)) +
                     200 * parseFloat(calculateCost(OPERATION_ESTIMATES.plan_adjustment, currentModel)) +
                     500 * parseFloat(calculateCost(OPERATION_ESTIMATES.workout_analysis, currentModel)) +
                     50 * parseFloat(calculateCost(OPERATION_ESTIMATES.race_analysis, currentModel)))
                  ).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> These are estimates based on typical token usage. Actual costs may vary depending on 
              prompt complexity, response length, and specific use cases. Token counts are approximate averages.
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostEstimationModal;
