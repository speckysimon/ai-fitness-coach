import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

const IllnessHistoryModal = ({ onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch('/api/adaptation/history', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.events || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (eventId) => {
    setConfirmDelete(eventId);
  };

  const handleConfirmDelete = async () => {
    const eventId = confirmDelete;
    setConfirmDelete(null);
    setDeleting(eventId);
    
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`/api/adaptation/illness/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (response.ok) {
        // Remove from list
        setHistory(history.filter(e => e.id !== eventId));
      } else {
        alert('Failed to delete entry. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'mild':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'moderate':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'severe':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isActive = (event) => {
    if (!event.end_date) return true;
    return new Date(event.end_date) > new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Illness & Injury History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No illness or injury records found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 ${
                    isActive(event) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Type and Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 capitalize">
                          {event.event_type?.replace('_', ' ')}
                        </span>
                        {isActive(event) && (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 border border-red-200">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Category and Severity */}
                      <div className="flex items-center gap-2 mb-3">
                        {event.category && (
                          <span className="text-sm text-gray-600 capitalize">
                            {event.category}
                          </span>
                        )}
                        {event.severity && (
                          <span className={`px-2 py-0.5 text-xs rounded border ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <strong>Started:</strong> {formatDate(event.start_date)}
                        </div>
                        <div>
                          <strong>Ended:</strong> {event.end_date ? formatDate(event.end_date) : 'Ongoing'}
                        </div>
                      </div>

                      {/* Notes */}
                      {event.notes && (
                        <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-2">
                          {event.notes}
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="mt-2 text-xs text-gray-400">
                        Logged: {formatDate(event.created_at)}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      onClick={() => handleDeleteClick(event.id)}
                      disabled={deleting === event.id}
                      variant="outline"
                      className="ml-4 text-red-600 border-red-300 hover:bg-red-50"
                      size="sm"
                    >
                      {deleting === event.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {history.length} {history.length === 1 ? 'entry' : 'entries'} total
          </p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Entry?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this illness/injury entry? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={handleCancelDelete}
                variant="outline"
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IllnessHistoryModal;
