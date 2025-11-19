import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Plus, Edit2, Trash2, Save, X, RefreshCw,
  TrendingUp, Clock, CheckCircle, Archive, AlertCircle
} from 'lucide-react';
import { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardContent } from '../../components/ui/AdminCard';
import { AdminButton } from '../../components/ui/AdminButton';

const IdeasManagement = () => {
  const [ideas, setIdeas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedIdeas, setExpandedIdeas] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium',
    scale: 'medium',
    status: 'backlog',
    estimated_hours: '',
    tags: [],
    source: 'team'
  });

  const categories = [
    { value: 'feature', label: 'Feature', color: 'blue' },
    { value: 'improvement', label: 'Improvement', color: 'green' },
    { value: 'bug_fix', label: 'Bug Fix', color: 'red' },
    { value: 'enhancement', label: 'Enhancement', color: 'purple' },
    { value: 'integration', label: 'Integration', color: 'cyan' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'medium', label: 'Medium', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' }
  ];

  const scales = [
    { value: 'small', label: 'Small (< 8h)', color: 'green' },
    { value: 'medium', label: 'Medium (8-24h)', color: 'blue' },
    { value: 'large', label: 'Large (24-80h)', color: 'orange' },
    { value: 'epic', label: 'Epic (80h+)', color: 'purple' }
  ];

  const statuses = [
    { value: 'backlog', label: 'Backlog', color: 'gray' },
    { value: 'planned', label: 'Planned', color: 'blue' },
    { value: 'in_progress', label: 'In Progress', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'archived', label: 'Archived', color: 'gray' }
  ];

  useEffect(() => {
    loadIdeas();
    loadStats();
  }, [filterStatus, filterPriority, filterCategory]);

  const loadIdeas = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const response = await fetch(`/api/admin/ideas?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setIdeas(data.ideas);
      }
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/ideas/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('admin_token');
      const url = editingId ? `/api/admin/ideas/${editingId}` : '/api/admin/ideas';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        loadIdeas();
        loadStats();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving idea:', error);
    }
  };

  const handleEdit = (idea) => {
    setFormData({
      title: idea.title,
      description: idea.description || '',
      category: idea.category,
      priority: idea.priority,
      scale: idea.scale,
      status: idea.status,
      estimated_hours: idea.estimated_hours || '',
      tags: idea.tags || [],
      source: idea.source || 'team'
    });
    setEditingId(idea.id);
    setShowNewForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this idea?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/ideas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        loadIdeas();
        loadStats();
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'feature',
      priority: 'medium',
      scale: 'medium',
      status: 'backlog',
      estimated_hours: '',
      tags: [],
      source: 'team'
    });
    setEditingId(null);
    setShowNewForm(false);
  };

  const getPriorityColor = (priority) => {
    const p = priorities.find(pr => pr.value === priority);
    return p ? p.color : 'gray';
  };

  const getCategoryColor = (category) => {
    const c = categories.find(cat => cat.value === category);
    return c ? c.color : 'gray';
  };

  const getScaleColor = (scale) => {
    const s = scales.find(sc => sc.value === scale);
    return s ? s.color : 'gray';
  };

  const getStatusColor = (status) => {
    const st = statuses.find(s => s.value === status);
    return st ? st.color : 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Ideas & Improvements</h1>
        </div>
        <div className="flex gap-2">
          <AdminButton
            variant="outline"
            onClick={() => {
              loadIdeas();
              loadStats();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </AdminButton>
          <AdminButton
            onClick={() => {
              resetForm();
              setShowNewForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Idea
          </AdminButton>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <AdminCard>
            <AdminCardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total Ideas</div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-500">{stats.backlog}</div>
                <div className="text-sm text-gray-600 mt-1">Backlog</div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.in_progress}</div>
                <div className="text-sm text-gray-600 mt-1">In Progress</div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.critical || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Critical</div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.high}</div>
                <div className="text-sm text-gray-600 mt-1">High Priority</div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600 mt-1">Completed</div>
              </div>
            </AdminCardContent>
          </AdminCard>
        </div>
      )}

      {/* Filters */}
      <AdminCard>
        <AdminCardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Statuses</option>
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Priorities</option>
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* New/Edit Form */}
      {(showNewForm || editingId) && (
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>
              {editingId ? 'Edit Idea' : 'New Idea'}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scale *</label>
                  <select
                    value={formData.scale}
                    onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {scales.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Est. Hours</label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <AdminButton type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </AdminButton>
                <AdminButton type="button" variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </AdminButton>
              </div>
            </form>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideas.map(idea => (
          <AdminCard key={idea.id} className="hover:shadow-lg transition-shadow">
            <AdminCardContent className="pt-6">
              <div className="space-y-3">
                {/* Header with edit/delete buttons */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 flex-1">{idea.title}</h3>
                  <div className="flex gap-1">
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(idea)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(idea.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </AdminButton>
                  </div>
                </div>

                {/* Collapsible Description */}
                {idea.description && (
                  <div>
                    <p className={`text-sm text-gray-600 ${expandedIdeas[idea.id] ? '' : 'line-clamp-2'}`}>
                      {idea.description}
                    </p>
                    {idea.description.length > 100 && (
                      <button
                        onClick={() => setExpandedIdeas(prev => ({ ...prev, [idea.id]: !prev[idea.id] }))}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        {expandedIdeas[idea.id] ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-${getCategoryColor(idea.category)}-100 text-${getCategoryColor(idea.category)}-700`}>
                      {categories.find(c => c.value === idea.category)?.label}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-${getPriorityColor(idea.priority)}-100 text-${getPriorityColor(idea.priority)}-700`}>
                      {priorities.find(p => p.value === idea.priority)?.label}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-${getScaleColor(idea.scale)}-100 text-${getScaleColor(idea.scale)}-700`}>
                      {scales.find(s => s.value === idea.scale)?.label}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-${getStatusColor(idea.status)}-100 text-${getStatusColor(idea.status)}-700`}>
                      {statuses.find(s => s.value === idea.status)?.label}
                    </span>
                  </div>

                  {/* Footer with time, date, and tags */}
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {idea.estimated_hours ? `${idea.estimated_hours}h` : 'No estimate'}
                      </div>
                      <div>
                        {new Date(idea.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {/* Tags */}
                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {idea.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </AdminCardContent>
            </AdminCard>
        ))}
      </div>

      {ideas.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No ideas found. Create your first one!</p>
        </div>
      )}
    </div>
  );
};

export default IdeasManagement;
