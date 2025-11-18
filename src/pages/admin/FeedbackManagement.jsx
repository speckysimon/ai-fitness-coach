import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Filter, RefreshCw, CheckCircle, Clock, AlertCircle, Trash2, Eye, TrendingUp, BarChart3 } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle, AdminCardDescription as CardDescription } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    avgRating: 0,
    byCategory: {}
  });

  useEffect(() => {
    loadFeedbacks();
  }, [statusFilter, categoryFilter, ratingFilter]);

  const loadFeedbacks = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // Build query params
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('limit', '100');
      
      const response = await fetch(`/api/feedback?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        let filteredFeedbacks = data.feedback;
        
        // Apply rating filter client-side
        if (ratingFilter !== 'all') {
          const rating = parseInt(ratingFilter);
          filteredFeedbacks = filteredFeedbacks.filter(f => f.rating === rating);
        }
        
        setFeedbacks(filteredFeedbacks);
        calculateStats(filteredFeedbacks);
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (feedbackList) => {
    const stats = {
      total: feedbackList.length,
      new: feedbackList.filter(f => f.status === 'new').length,
      inProgress: feedbackList.filter(f => f.status === 'in_progress').length,
      resolved: feedbackList.filter(f => f.status === 'resolved').length,
      avgRating: 0,
      byCategory: {}
    };

    // Calculate average rating
    const ratingsSum = feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0);
    stats.avgRating = feedbackList.length > 0 ? (ratingsSum / feedbackList.length).toFixed(1) : 0;

    // Count by category
    feedbackList.forEach(f => {
      stats.byCategory[f.category] = (stats.byCategory[f.category] || 0) + 1;
    });

    setStats(stats);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeedbacks();
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        loadFeedbacks();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback({ ...selectedFeedback, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        loadFeedbacks();
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Clock, label: 'New' },
      in_progress: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertCircle, label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle, label: 'Resolved' },
      dismissed: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock, label: 'Dismissed' }
    };
    
    const badge = badges[status] || badges.new;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      general: 'bg-gray-100 text-gray-700',
      bug: 'bg-red-100 text-red-700',
      feature: 'bg-purple-100 text-purple-700',
      ui: 'bg-blue-100 text-blue-700',
      other: 'bg-orange-100 text-orange-700'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[category] || colors.other}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600 mt-1">Monitor and respond to user feedback</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New</p>
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-purple-600">{stats.avgRating}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Feedback by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{category}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="general">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="ui">UI/UX Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Submissions ({feedbacks.length})</CardTitle>
          <CardDescription>Click on any feedback to view details and manage status</CardDescription>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No feedback found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedFeedback(feedback);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {renderStars(feedback.rating)}
                        {getCategoryBadge(feedback.category)}
                        {getStatusBadge(feedback.status)}
                      </div>
                      
                      <p className="text-gray-900 font-medium mb-1 line-clamp-2">
                        {feedback.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{feedback.email}</span>
                        <span>•</span>
                        <span>{new Date(feedback.timestamp).toLocaleString()}</span>
                        {feedback.url && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{feedback.url}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFeedback(feedback);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Details</h2>
                  <div className="flex items-center gap-3">
                    {renderStars(selectedFeedback.rating)}
                    {getCategoryBadge(selectedFeedback.category)}
                    {getStatusBadge(selectedFeedback.status)}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedFeedback.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedFeedback.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                    <p className="text-gray-900">{selectedFeedback.user_email || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                  <p className="text-gray-900">{new Date(selectedFeedback.timestamp).toLocaleString()}</p>
                </div>

                {selectedFeedback.url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
                    <p className="text-gray-900 text-sm break-all">{selectedFeedback.url}</p>
                  </div>
                )}

                {selectedFeedback.user_agent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                    <p className="text-gray-600 text-xs break-all">{selectedFeedback.user_agent}</p>
                  </div>
                )}

                {selectedFeedback.admin_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                    <p className="text-gray-900 bg-yellow-50 p-3 rounded-lg">{selectedFeedback.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateStatus(selectedFeedback.id, 'new')}
                    variant="outline"
                    size="sm"
                    disabled={selectedFeedback.status === 'new'}
                  >
                    Mark as New
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(selectedFeedback.id, 'in_progress')}
                    variant="outline"
                    size="sm"
                    disabled={selectedFeedback.status === 'in_progress'}
                  >
                    In Progress
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(selectedFeedback.id, 'resolved')}
                    variant="outline"
                    size="sm"
                    disabled={selectedFeedback.status === 'resolved'}
                  >
                    Resolve
                  </Button>
                </div>

                <Button
                  onClick={() => handleDelete(selectedFeedback.id)}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
