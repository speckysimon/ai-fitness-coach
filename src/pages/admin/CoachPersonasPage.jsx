import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Upload, Image as ImageIcon, Sparkles, Loader } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const CoachPersonasPage = () => {
  const [personas, setPersonas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    avatar: '',
    style: '',
    description: '',
    tone: '',
    catchphrase: '',
    color: '',
    personality: '',
    is_active: true,
    sort_order: 0
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/personas/admin/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPersonas(data.personas);
        setStats(data.stats);
      } else {
        setError('Failed to load personas');
      }
    } catch (err) {
      console.error('Error loading personas:', err);
      setError('Error loading personas');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar file must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Avatar must be an image file');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a prompt for image generation');
      return;
    }

    setGeneratingImage(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      
      // Always add "photo realistic" to the prompt
      const enhancedPrompt = `${aiPrompt}. Photo realistic, high quality portrait photography.`;
      
      const response = await fetch('/api/image-generation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          aspectRatio: '1:1'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Backend error:', data);
        setError(data.error || `Failed to generate image (${response.status})`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Set the generated image as preview
        setAvatarPreview(data.imageUrl);
        setSuccess('Image generated successfully! Click "Use as Avatar" or "Regenerate" to try again.');
        // Don't close the generator so user can try different prompts
      } else {
        console.error('Backend error:', data);
        setError(data.error || 'Failed to generate image');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      setError(`Error generating image: ${err.message}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleUseGeneratedImage = async () => {
    if (!avatarPreview) return;

    try {
      // Fetch the generated image and convert to File object
      const response = await fetch(avatarPreview);
      const blob = await response.blob();
      const filename = avatarPreview.split('/').pop();
      const file = new File([blob], filename, { type: 'image/png' });
      
      setAvatarFile(file);
      setShowAIGenerator(false);
      setSuccess('AI-generated image set as avatar. Save the form to apply.');
    } catch (err) {
      console.error('Error using generated image:', err);
      setError('Error using generated image');
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      avatar: '',
      style: '',
      description: '',
      tone: '',
      catchphrase: '',
      color: '',
      personality: '',
      is_active: true,
      sort_order: 0
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('admin_token');
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      const response = await fetch('/api/personas/admin/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Persona created successfully');
        resetForm();
        loadPersonas();
      } else {
        setError(data.error || 'Failed to create persona');
      }
    } catch (err) {
      console.error('Error creating persona:', err);
      setError('Error creating persona');
    }
  };

  const handleUpdate = async (id) => {
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('admin_token');
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      const response = await fetch(`/api/personas/admin/update/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Persona updated successfully');
        resetForm();
        loadPersonas();
      } else {
        setError(data.error || 'Failed to update persona');
      }
    } catch (err) {
      console.error('Error updating persona:', err);
      setError('Error updating persona');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this persona?')) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/personas/admin/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Persona deleted successfully');
        loadPersonas();
      } else {
        setError(data.error || 'Failed to delete persona');
      }
    } catch (err) {
      console.error('Error deleting persona:', err);
      setError('Error deleting persona');
    }
  };

  const startEdit = (persona) => {
    setFormData({
      id: persona.id,
      name: persona.name,
      avatar: persona.avatar || '',
      style: persona.style,
      description: persona.description,
      tone: persona.tone,
      catchphrase: persona.catchphrase,
      color: persona.color,
      personality: persona.personality,
      is_active: persona.is_active,
      sort_order: persona.sort_order
    });
    setAvatarPreview(persona.avatar_url);
    setEditingId(persona.id);
    setShowCreateForm(false);
  };

  const toneOptions = [
    { value: 'enthusiastic', label: 'Enthusiastic' },
    { value: 'analytical', label: 'Analytical' },
    { value: 'supportive', label: 'Supportive' },
    { value: 'strategic', label: 'Strategic' },
    { value: 'experienced', label: 'Experienced' },
    { value: 'direct', label: 'Direct' }
  ];

  const colorOptions = [
    { value: 'from-orange-400 to-red-500', label: 'Orange to Red' },
    { value: 'from-blue-400 to-indigo-600', label: 'Blue to Indigo' },
    { value: 'from-green-400 to-emerald-600', label: 'Green to Emerald' },
    { value: 'from-purple-400 to-pink-500', label: 'Purple to Pink' },
    { value: 'from-yellow-400 to-amber-600', label: 'Yellow to Amber' },
    { value: 'from-cyan-400 to-blue-500', label: 'Cyan to Blue' },
    { value: 'from-rose-400 to-red-600', label: 'Rose to Red' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading personas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Coach Personas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage AI coach personalities and avatars
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateForm(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Persona
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Personas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Personas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.with_avatars}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">With Avatars</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Persona</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID (unique, lowercase)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., motivator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Coach Alex"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Avatar Emoji (fallback)
                  </label>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., 💪"
                    maxLength="2"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Used when photo avatar is not available
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Style
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.style}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Motivational"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tone
                  </label>
                  <select
                    required
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select tone...</option>
                    {toneOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows="2"
                  placeholder="Brief description of coaching style"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Catchphrase
                </label>
                <input
                  type="text"
                  value={formData.catchphrase}
                  onChange={(e) => setFormData({ ...formData, catchphrase: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g., Let's crush this!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color Gradient
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select color...</option>
                  {colorOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Personality
                </label>
                <textarea
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows="2"
                  placeholder="Detailed personality traits"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Avatar Image
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Choose Image
                  </label>
                  {avatarPreview && (
                    <>
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-3xl"
                        style={{ display: 'none' }}
                      >
                        {formData.avatar || '👤'}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max 5MB. Recommended: 200x200px square image
                </p>
                
                {/* AI Image Generator */}
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {showAIGenerator ? 'Hide' : 'Generate with AI (DALL-E 3)'}
                  </Button>
                  
                  {showAIGenerator && (
                    <div className="mt-3 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Describe the coach avatar
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., Professional cycling coach, friendly smile, athletic build, studio lighting"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        rows="3"
                      />
                      <div className="flex gap-2 mt-3">
                        <Button
                          type="button"
                          onClick={handleGenerateImage}
                          disabled={generatingImage || !aiPrompt.trim()}
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                        >
                          {generatingImage ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Image
                            </>
                          )}
                        </Button>
                        {avatarPreview && !generatingImage && (
                          <>
                            <Button
                              type="button"
                              onClick={handleGenerateImage}
                              size="sm"
                              variant="outline"
                              className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Regenerate
                            </Button>
                            <Button
                              type="button"
                              onClick={handleUseGeneratedImage}
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                            >
                              Use as Avatar
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {/* Large Preview Box */}
                      {avatarPreview && (
                        <div className="mt-4 p-3 border-2 border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Generated Preview:</p>
                          <div className="flex justify-center">
                            <img 
                              src={avatarPreview} 
                              alt="Generated avatar preview" 
                              className="w-64 h-64 object-cover rounded-lg shadow-lg"
                            />
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                        💡 Tip: Be specific! "Photo realistic" is automatically added. Try: "Professional cycling coach, friendly smile, athletic build"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Create Persona
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Personas List */}
      <div className="space-y-4">
        {personas.map((persona) => (
          <Card key={persona.id}>
            <CardContent className="pt-6">
              {editingId === persona.id ? (
                // Edit Form
                <form onSubmit={(e) => { e.preventDefault(); handleUpdate(persona.id); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Avatar Emoji (fallback)
                      </label>
                      <input
                        type="text"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="e.g., 💪"
                        maxLength="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Style
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.style}
                        onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tone
                      </label>
                      <select
                        required
                        value={formData.tone}
                        onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select tone...</option>
                        {toneOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows="2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Catchphrase
                    </label>
                    <input
                      type="text"
                      value={formData.catchphrase}
                      onChange={(e) => setFormData({ ...formData, catchphrase: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., Let's crush this!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color Gradient
                    </label>
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Select color...</option>
                      {colorOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Personality
                    </label>
                    <textarea
                      value={formData.personality}
                      onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows="2"
                      placeholder="Detailed personality traits"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Avatar Image
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        id={`avatar-edit-${persona.id}`}
                      />
                      <label
                        htmlFor={`avatar-edit-${persona.id}`}
                        className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Change Image
                      </label>
                      {avatarPreview && (
                        <>
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div 
                            className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-3xl"
                            style={{ display: 'none' }}
                          >
                            {formData.avatar || '👤'}
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Max 5MB. Recommended: 200x200px square image
                    </p>
                    
                    {/* AI Image Generator */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={() => setShowAIGenerator(!showAIGenerator)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {showAIGenerator ? 'Hide' : 'Generate with AI (DALL-E 3)'}
                      </Button>
                      
                      {showAIGenerator && (
                        <div className="mt-3 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Describe the coach avatar
                          </label>
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., Professional cycling coach, friendly smile, athletic build, studio lighting"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            rows="3"
                          />
                          <div className="flex gap-2 mt-3">
                            <Button
                              type="button"
                              onClick={handleGenerateImage}
                              disabled={generatingImage || !aiPrompt.trim()}
                              size="sm"
                              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                            >
                              {generatingImage ? (
                                <>
                                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generate Image
                                </>
                              )}
                            </Button>
                            {avatarPreview && !generatingImage && (
                              <>
                                <Button
                                  type="button"
                                  onClick={handleGenerateImage}
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                                >
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Regenerate
                                </Button>
                                <Button
                                  type="button"
                                  onClick={handleUseGeneratedImage}
                                  size="sm"
                                  className="bg-green-600 text-white hover:bg-green-700"
                                >
                                  Use as Avatar
                                </Button>
                              </>
                            )}
                          </div>
                          
                          {/* Large Preview Box */}
                          {avatarPreview && (
                            <div className="mt-4 p-3 border-2 border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Generated Preview:</p>
                              <div className="flex justify-center">
                                <img 
                                  src={avatarPreview} 
                                  alt="Generated avatar preview" 
                                  className="w-64 h-64 object-cover rounded-lg shadow-lg"
                                />
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                            💡 Tip: Be specific! "Photo realistic" is automatically added. Try: "Professional cycling coach, friendly smile, athletic build"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-green-600 text-white hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                // Display View
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {persona.avatar_url ? (
                      <img
                        src={persona.avatar_url}
                        alt={persona.name}
                        className="rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                        style={{ width: '120px', height: '120px' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-4xl"
                      style={{ display: persona.avatar_url ? 'none' : 'flex', width: '120px', height: '120px' }}
                    >
                      {persona.avatar || <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {persona.name}
                          {!persona.is_active && (
                            <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                              Inactive
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{persona.style}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(persona)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(persona.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      {persona.description}
                    </p>
                    
                    <div className={`mt-2 inline-block px-3 py-1 rounded-lg bg-gradient-to-r ${persona.color} text-white text-xs font-semibold`}>
                      "{persona.catchphrase}"
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Tone:</span> {persona.tone} • 
                      <span className="font-medium ml-2">ID:</span> {persona.id}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachPersonasPage;
