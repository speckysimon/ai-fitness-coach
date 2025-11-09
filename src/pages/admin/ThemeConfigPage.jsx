import React, { useState, useEffect } from 'react';
import { Palette, Save, Plus, Edit2, Trash2, Eye, RefreshCw, Copy, Check } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle, AdminCardDescription as CardDescription } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';
import { reloadTheme } from '../../lib/themeService';

const ThemeConfigPage = () => {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingTheme, setEditingTheme] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedColor, setCopiedColor] = useState('');

  // Default theme categories and their colors (CONSOLIDATED - 12 colors)
  const defaultThemeCategories = [
    {
      category: 'brand',
      label: 'Brand Colors',
      description: 'Primary brand color and accent for gradients',
      colors: [
        { name: 'primary', label: 'Primary', light: '#2563EB', dark: '#3B82F6' },
        { name: 'accent', label: 'Accent', light: '#9333EA', dark: '#A855F7' },
      ]
    },
    {
      category: 'status',
      label: 'Status Colors',
      description: 'Colors for success, warning, and error states',
      colors: [
        { name: 'success', label: 'Success', light: '#10B981', dark: '#34D399' },
        { name: 'warning', label: 'Warning', light: '#F59E0B', dark: '#FBBF24' },
        { name: 'error', label: 'Error', light: '#EF4444', dark: '#F87171' },
      ]
    },
    {
      category: 'activity',
      label: 'Training Session Types',
      description: 'Colors for different training intensities',
      colors: [
        { name: 'recovery', label: 'Recovery', light: '#10B981', dark: '#34D399' },
        { name: 'endurance', label: 'Endurance', light: '#3B82F6', dark: '#60A5FA' },
        { name: 'tempo', label: 'Tempo', light: '#F59E0B', dark: '#FBBF24' },
        { name: 'threshold', label: 'Threshold', light: '#F97316', dark: '#FB923C' },
        { name: 'vo2max', label: 'VO2 Max', light: '#EF4444', dark: '#F87171' },
        { name: 'sprint', label: 'Sprint', light: '#A855F7', dark: '#C084FC' },
      ]
    },
  ];

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/theme-configs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setThemes(data.themes || []);
      }
    } catch (error) {
      console.error('Error loading themes:', error);
      setError('Failed to load theme configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTheme = async (themeData) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token');
      const url = themeData.id 
        ? `/api/admin/theme-configs/${themeData.id}`
        : '/api/admin/theme-configs';
      
      const response = await fetch(url, {
        method: themeData.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(themeData),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(themeData.id ? 'Theme updated successfully' : 'Theme created successfully');
        loadThemes();
        setEditingTheme(null);
        setShowAddModal(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save theme');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      setError('Failed to save theme configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTheme = async (themeId) => {
    if (!window.confirm('Are you sure you want to delete this theme configuration?')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/theme-configs/${themeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Theme deleted successfully');
        loadThemes();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting theme:', error);
      setError('Failed to delete theme');
    }
  };

  const handleSetActive = async (themeId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/theme-configs/${themeId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Active theme updated - reloading theme...');
        loadThemes();
        
        // Reload theme on frontend to apply changes immediately
        await reloadTheme();
        setSuccess('Active theme updated and applied successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error setting active theme:', error);
      setError('Failed to set active theme');
    }
  };

  const copyToClipboard = (color) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(''), 2000);
  };

  const initializeDefaultThemes = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      
      // Create default theme with all categories
      const defaultTheme = {
        name: 'RiderLabs Default',
        description: 'Default theme with all color categories',
        is_active: true,
        config: {}
      };

      // Build config object from default categories
      defaultThemeCategories.forEach(category => {
        category.colors.forEach(color => {
          defaultTheme.config[color.name] = {
            light: color.light,
            dark: color.dark,
            label: color.label,
            category: category.category
          };
        });
      });

      await handleSaveTheme(defaultTheme);
    } catch (error) {
      console.error('Error initializing themes:', error);
      setError('Failed to initialize default themes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading theme configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Palette className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            Theme Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage color themes and ensure consistency across all UI elements
          </p>
        </div>
        <div className="flex gap-3">
          {themes.length === 0 && (
            <Button
              onClick={initializeDefaultThemes}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Initialize Default Themes
            </Button>
          )}
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Theme
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
        </div>
      )}

      {/* Theme List */}
      {themes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Palette className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Themes Configured
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Initialize default themes or create a custom theme to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {themes.map((theme) => (
            <Card key={theme.id} className={theme.is_active ? 'border-2 border-purple-500 dark:border-purple-600' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {theme.name}
                      {theme.is_active && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded">
                          ACTIVE
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{theme.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!theme.is_active && (
                      <Button
                        onClick={() => handleSetActive(theme.id)}
                        variant="outline"
                        size="sm"
                        className="border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Set Active
                      </Button>
                    )}
                    <Button
                      onClick={() => setEditingTheme(theme)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteTheme(theme.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Display theme colors by category */}
                {defaultThemeCategories.map((category) => {
                  const categoryColors = Object.entries(theme.config || {}).filter(
                    ([key, value]) => value.category === category.category
                  );

                  if (categoryColors.length === 0) return null;

                  return (
                    <div key={category.category} className="mb-6 last:mb-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        {category.label}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {categoryColors.map(([colorName, colorValue]) => (
                          <div key={colorName} className="space-y-2">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {colorValue.label || colorName}
                            </div>
                            <div className="flex gap-2">
                              {/* Light mode color */}
                              <div className="flex-1">
                                <div
                                  className="w-full h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform"
                                  style={{ backgroundColor: colorValue.light }}
                                  onClick={() => copyToClipboard(colorValue.light)}
                                  title={`Light: ${colorValue.light}`}
                                />
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
                                  <span>Light</span>
                                  {copiedColor === colorValue.light ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 cursor-pointer hover:text-gray-700" onClick={() => copyToClipboard(colorValue.light)} />
                                  )}
                                </div>
                              </div>
                              {/* Dark mode color */}
                              <div className="flex-1">
                                <div
                                  className="w-full h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform"
                                  style={{ backgroundColor: colorValue.dark }}
                                  onClick={() => copyToClipboard(colorValue.dark)}
                                  title={`Dark: ${colorValue.dark}`}
                                />
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
                                  <span>Dark</span>
                                  {copiedColor === colorValue.dark ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 cursor-pointer hover:text-gray-700" onClick={() => copyToClipboard(colorValue.dark)} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Theme Editor Modal (simplified for now) */}
      {(editingTheme || showAddModal) && (
        <ThemeEditorModal
          theme={editingTheme}
          categories={defaultThemeCategories}
          onSave={handleSaveTheme}
          onClose={() => {
            setEditingTheme(null);
            setShowAddModal(false);
          }}
          saving={saving}
        />
      )}
    </div>
  );
};

// Theme Editor Modal Component
const ThemeEditorModal = ({ theme, categories, onSave, onClose, saving }) => {
  const [formData, setFormData] = useState({
    name: theme?.name || '',
    description: theme?.description || '',
    config: theme?.config || {}
  });

  const handleColorChange = (colorName, mode, value) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [colorName]: {
          ...prev.config[colorName],
          [mode]: value
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: theme?.id
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {theme ? 'Edit Theme' : 'Create New Theme'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows="2"
              />
            </div>

            {/* Color Configuration */}
            {categories.map((category) => (
              <div key={category.category} className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {category.label}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {category.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.colors.map((color) => {
                    const currentValue = formData.config[color.name] || color;
                    return (
                      <div key={color.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {color.label}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Light Mode
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={currentValue.light}
                                onChange={(e) => handleColorChange(color.name, 'light', e.target.value)}
                                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                              />
                              <input
                                type="text"
                                value={currentValue.light}
                                onChange={(e) => handleColorChange(color.name, 'light', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Dark Mode
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={currentValue.dark}
                                onChange={(e) => handleColorChange(color.name, 'dark', e.target.value)}
                                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                              />
                              <input
                                type="text"
                                value={currentValue.dark}
                                onChange={(e) => handleColorChange(color.name, 'dark', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Theme
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeConfigPage;
