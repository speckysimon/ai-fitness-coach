import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw, Edit2 } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle, AdminCardDescription as CardDescription } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';

const APIKeysPage = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [formData, setFormData] = useState({
    keyName: '',
    provider: 'openai',
    apiKey: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate based on provider type
    if (!formData.keyName || !formData.provider) {
      setError('Key name and provider are required');
      return;
    }

    const requiresOAuth = ['strava', 'google', 'intervals'].includes(formData.provider);
    if (requiresOAuth) {
      if (!formData.clientId || !formData.clientSecret || !formData.redirectUri) {
        setError('Client ID, Client Secret, and Redirect URI are required for OAuth providers');
        return;
      }
    } else {
      if (!formData.apiKey) {
        setError('API Key is required');
        return;
      }
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('API credentials stored successfully');
        setFormData({ keyName: '', provider: 'openai', apiKey: '', clientId: '', clientSecret: '', redirectUri: '' });
        setShowCreateModal(false);
        loadApiKeys();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to store API key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      setError('Failed to store API key');
    }
  };

  const handleEditKey = (key) => {
    setEditingKey(key.provider);
    setFormData({
      keyName: key.key_name || key.provider,
      provider: key.provider,
      apiKey: key.api_key || '',
      clientId: key.client_id || '',
      clientSecret: '', // Don't pre-fill for security
      redirectUri: key.redirect_uri || '',
    });
    setShowCreateModal(true);
  };

  const handleUpdateKey = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const requiresOAuth = ['strava', 'google', 'intervals'].includes(formData.provider);
    if (requiresOAuth) {
      if (!formData.clientId || !formData.redirectUri) {
        setError('Client ID and Redirect URI are required for OAuth providers');
        return;
      }
      // Client secret is optional for updates (only if changing)
    } else {
      // API key is optional for updates (only if changing)
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/api-keys/${editingKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('API credentials updated successfully');
        setFormData({ keyName: '', provider: 'openai', apiKey: '', clientId: '', clientSecret: '', redirectUri: '' });
        setShowCreateModal(false);
        setEditingKey(null);
        loadApiKeys();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update API key');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      setError('Failed to update API key');
    }
  };

  const handleDeleteKey = async (provider) => {
    if (!confirm(`Are you sure you want to delete the API key for "${provider}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/api-keys/${provider}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('API key deleted successfully');
        loadApiKeys();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyName) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    return key.substring(0, 8) + '•'.repeat(20) + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Key Management</h1>
          <p className="text-gray-600 mt-1">Securely manage API keys for all services - no .env needed!</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={async () => {
              try {
                const token = localStorage.getItem('admin_token');
                const response = await fetch('/api/admin/refresh-api-keys', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (data.success) {
                  setSuccess('API keys refreshed! Server is now using database keys.');
                  setTimeout(() => setSuccess(''), 3000);
                }
              } catch (error) {
                setError('Failed to refresh keys');
              }
            }}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Keys
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add API Key
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Security Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Security:</strong> API keys are encrypted with AES-256 before storage.
            Only the last 4 characters are displayed for security. Keep your keys secure and never share them.
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Stored API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No API keys configured</p>
              <p className="text-sm text-gray-500">Add your first API key to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.provider}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                          <Key className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 capitalize">{key.provider}</h3>
                          <p className="text-sm text-gray-600">Provider: {key.provider}</p>
                        </div>
                        {key.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-11">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {visibleKeys[key.provider] ? key.api_key : maskApiKey(key.api_key)}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(key.provider)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={visibleKeys[key.provider] ? 'Hide key' : 'Show key'}
                        >
                          {visibleKeys[key.provider] ? (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 ml-11">
                        Created: {new Date(key.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditKey(key)}
                        className="text-blue-600 hover:bg-blue-50"
                        title="Edit credentials"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteKey(key.provider)}
                        className="text-red-600 hover:bg-red-50"
                        title="Delete key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{editingKey ? 'Edit API Credentials' : 'Add API Credentials'}</CardTitle>
                  <CardDescription>
                    {editingKey
                      ? 'Update credentials (leave Client Secret/API Key empty to keep existing)'
                      : ['strava', 'google', 'intervals'].includes(formData.provider)
                      ? 'Store OAuth credentials (Client ID, Secret, Redirect URI)'
                      : 'Store a new API key for a service provider'
                    }
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingKey(null);
                    setFormData({ keyName: '', provider: 'openai', apiKey: '', clientId: '', clientSecret: '', redirectUri: '' });
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingKey ? handleUpdateKey : handleCreateKey} className="space-y-4">
                {/* Key Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={formData.keyName}
                    onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., production-openai"
                  />
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <optgroup label="AI Providers">
                      <option value="openai">OpenAI (ChatGPT)</option>
                      <option value="gemini">Google Gemini</option>
                    </optgroup>
                    <optgroup label="Third-Party Services">
                      <option value="strava">Strava</option>
                      <option value="google">Google (OAuth & Calendar)</option>
                      <option value="intervals">Intervals.icu</option>
                      <option value="openweather">OpenWeather</option>
                    </optgroup>
                  </select>
                </div>

                {/* Conditional Fields Based on Provider */}
                {['strava', 'google', 'intervals'].includes(formData.provider) ? (
                  // OAuth Providers (Strava, Google, Intervals.icu)
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="Your client ID"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Public identifier (not secret)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={formData.clientSecret}
                        onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder={editingKey ? "Leave empty to keep existing" : "Your client secret"}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {editingKey ? 'Leave empty to keep existing secret' : 'Will be encrypted before storage'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Redirect URI
                      </label>
                      <input
                        type="text"
                        value={formData.redirectUri}
                        onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder={formData.provider === 'strava' ? 'http://localhost:5001/api/auth/strava/callback' : 'http://localhost:5001/api/google/callback'}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        OAuth callback URL
                      </p>
                    </div>
                  </>
                ) : (
                  // Simple API Key Providers (OpenAI, Gemini, OpenWeather)
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder={editingKey ? "Leave empty to keep existing" : "sk-..."}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingKey ? 'Leave empty to keep existing key' : 'Your API key will be encrypted before storage'}
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    <Key className="w-4 h-4 mr-2" />
                    {editingKey ? 'Update Key' : 'Add Key'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingKey(null);
                      setFormData({ keyName: '', provider: 'openai', apiKey: '', clientId: '', clientSecret: '', redirectUri: '' });
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default APIKeysPage;
