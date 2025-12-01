import React, { useState, useEffect } from 'react';
import { Brain, Save, RefreshCw, Sparkles, TrendingUp, Calendar, Zap, DollarSign, Calculator } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle, AdminCardDescription as CardDescription } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';
import CostEstimationModal from '../../components/CostEstimationModal';

// Available models for each provider
const AVAILABLE_MODELS = {
  openai: [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Latest)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fastest)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro (Legacy)' },
    { value: 'gemini-pro', label: 'Gemini Pro (Legacy)' },
  ],
};

const AIConfigPage = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState({}); // Track saving state per config
  const [success, setSuccess] = useState('');
  const [activeProvider, setActiveProvider] = useState('openai'); // 'openai' or 'gemini'
  const [tokenUsage, setTokenUsage] = useState({
    total: 0,
    last7Days: 0,
    today: 0,
  });
  const [monthlyCost, setMonthlyCost] = useState({
    totalMonthlyCost: '0.00',
    breakdown: []
  });
  const [showCostModal, setShowCostModal] = useState(false);
  const [availableModels, setAvailableModels] = useState({ openai: [], gemini: [] });

  useEffect(() => {
    loadConfigs();
    loadTokenUsage();
    loadAvailableModels();
  }, []);

  const loadConfigs = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/ai-configs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setConfigs(data.configs);
        // Determine active provider from configs
        const activeConfig = data.configs.find(c => c.is_active === 1);
        if (activeConfig) {
          setActiveProvider(activeConfig.model_provider);
        }
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokenUsage = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/token-usage', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTokenUsage(data.usage);
        setMonthlyCost(data.cost);
      }
    } catch (error) {
      console.error('Error loading token usage:', error);
      // Fallback to zeros if API fails
      setTokenUsage({ total: 0, last7Days: 0, today: 0 });
      setMonthlyCost({ totalMonthlyCost: '0.00', breakdown: [] });
    }
  };

  const loadAvailableModels = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/available-models', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setAvailableModels(data.models);
      }
    } catch (error) {
      console.error('Error loading available models:', error);
    }
  };

  const handleUpdateConfig = async (featureName, updates) => {
    setSavingConfig(prev => ({ ...prev, [featureName]: true }));
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/ai-configs/${featureName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`${featureName.replace(/_/g, ' ')} updated successfully`);
        loadConfigs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setSuccess(`Failed to update ${featureName.replace(/_/g, ' ')}`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating config:', error);
      setSuccess(`Error updating ${featureName.replace(/_/g, ' ')}`);
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setSavingConfig(prev => ({ ...prev, [featureName]: false }));
    }
  };

  const handleToggleActive = async (featureName, isActive) => {
    await handleUpdateConfig(featureName, { is_active: !isActive });
  };

  const handleProviderSwitch = async (newProvider) => {
    if (newProvider === activeProvider) return; // Already active

    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');

      // Update all configs to switch provider
      for (const config of configs) {
        const shouldBeActive = config.model_provider === newProvider;
        await fetch(`/api/admin/ai-configs/${config.feature_name}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: shouldBeActive ? 1 : 0,
            model_provider: newProvider,
          }),
        });
      }

      setActiveProvider(newProvider);
      setSuccess(`Switched to ${newProvider === 'openai' ? 'ChatGPT' : 'Gemini'} successfully`);
      loadConfigs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error switching provider:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI configurations...</p>
        </div>
      </div>
    );
  }

  const openaiConfigs = configs.filter(c => c.model_provider === 'openai');
  const geminiConfigs = configs.filter(c => c.model_provider === 'gemini');

  const renderProviderColumn = (provider, providerConfigs, title, icon) => {
    const isActive = activeProvider === provider;

    return (
      <div className="w-1/2">
        <Card className={`h-full ${isActive ? 'ring-2 ring-blue-500' : 'opacity-60'}`}>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-xl">{title}</CardTitle>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => handleProviderSwitch(provider)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {isActive && (
              <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full inline-block">
                ACTIVE
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {providerConfigs.map((config) => (
              <div key={config.feature_name} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">
                  {config.feature_name.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Model
                    </label>
                    <select
                      value={config.model_name}
                      onChange={(e) => {
                        const newConfigs = configs.map((c) =>
                          c.feature_name === config.feature_name
                            ? { ...c, model_name: e.target.value }
                            : c
                        );
                        setConfigs(newConfigs);
                      }}
                      disabled={!isActive}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      {AVAILABLE_MODELS[provider].map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Temperature
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={config.temperature}
                      onChange={(e) => {
                        const newConfigs = configs.map((c) =>
                          c.feature_name === config.feature_name
                            ? { ...c, temperature: parseFloat(e.target.value) }
                            : c
                        );
                        setConfigs(newConfigs);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      disabled={!isActive}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={config.max_tokens || ''}
                      onChange={(e) => {
                        const newConfigs = configs.map((c) =>
                          c.feature_name === config.feature_name
                            ? { ...c, max_tokens: parseInt(e.target.value) }
                            : c
                        );
                        setConfigs(newConfigs);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      disabled={!isActive}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      handleUpdateConfig(config.feature_name, {
                        model_name: config.model_name,
                        temperature: config.temperature,
                        max_tokens: config.max_tokens,
                      })
                    }
                    size="sm"
                    disabled={savingConfig[config.feature_name] || !isActive}
                    className="w-full"
                  >
                    <Save className={`w-3 h-3 mr-2 ${savingConfig[config.feature_name] ? 'animate-spin' : ''}`} />
                    {savingConfig[config.feature_name] ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Model Configuration</h1>
          <p className="text-gray-600 mt-1">Choose your AI provider and configure model settings</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowCostModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-blue-600"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Cost Calculator
          </Button>
          <Button onClick={loadConfigs} variant="outline" disabled={saving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Only one AI provider can be active at a time. Toggle between ChatGPT and Gemini to switch providers.
        </p>
      </div>

      {/* Token Usage Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {tokenUsage.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time usage</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {tokenUsage.last7Days.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Weekly usage</p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {tokenUsage.today.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Daily usage</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${monthlyCost.totalMonthlyCost}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-6">
        {renderProviderColumn('openai', openaiConfigs, 'ChatGPT (OpenAI)', <Sparkles className="w-5 h-5 text-green-600" />)}
        {renderProviderColumn('gemini', geminiConfigs, 'Gemini (Google)', <Brain className="w-5 h-5 text-indigo-600" />)}
      </div>

      {/* Cost Estimation Modal */}
      <CostEstimationModal
        isOpen={showCostModal}
        onClose={() => setShowCostModal(false)}
        models={availableModels}
      />
    </div>
  );
};

export default AIConfigPage;
