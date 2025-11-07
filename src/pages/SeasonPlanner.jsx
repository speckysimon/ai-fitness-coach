import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, MapPin, Trophy, Tag, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import logger from '../lib/logger';

const SeasonPlanner = () => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRace, setEditingRace] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    distance: '',
    raceType: 'road_race',
    status: 'provisional',
    priority: 'B',
    notes: ''
  });

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/season-races', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRaces(data.races || []);
      }
    } catch (error) {
      logger.error('Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const sessionToken = localStorage.getItem('session_token');
      const url = editingRace 
        ? `/api/season-races/${editingRace.id}`
        : '/api/season-races';
      
      const method = editingRace ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadRaces();
        handleCloseModal();
      } else {
        alert('Failed to save race');
      }
    } catch (error) {
      logger.error('Error saving race:', error);
      alert('Error saving race');
    }
  };

  const handleDelete = async (raceId) => {
    if (!confirm('Are you sure you want to delete this race?')) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`/api/season-races/${raceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        await loadRaces();
      } else {
        alert('Failed to delete race');
      }
    } catch (error) {
      logger.error('Error deleting race:', error);
      alert('Error deleting race');
    }
  };

  const handleEdit = (race) => {
    setEditingRace(race);
    setFormData({
      name: race.name,
      date: race.date,
      location: race.location || '',
      distance: race.distance || '',
      raceType: race.race_type || 'road_race',
      status: race.status || 'provisional',
      priority: race.priority || 'B',
      notes: race.notes || ''
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingRace(null);
    setFormData({
      name: '',
      date: '',
      location: '',
      distance: '',
      raceType: 'road_race',
      status: 'provisional',
      priority: 'B',
      notes: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      provisional: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    const icons = {
      confirmed: <CheckCircle className="w-3 h-3" />,
      provisional: <Clock className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      A: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700',
      B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      C: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const getRaceTypeLabel = (type) => {
    const labels = {
      road_race: 'Road Race',
      criterium: 'Criterium',
      time_trial: 'Time Trial',
      gran_fondo: 'Gran Fondo',
      stage_race: 'Stage Race',
      gravel: 'Gravel',
      cyclocross: 'Cyclocross',
      track: 'Track',
      other: 'Other'
    };
    return labels[type] || type;
  };

  // Group races by month
  const racesByMonth = races.reduce((acc, race) => {
    const month = new Date(race.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(race);
    return acc;
  }, {});

  // Sort months chronologically
  const sortedMonths = Object.keys(racesByMonth).sort((a, b) => 
    new Date(racesByMonth[a][0].date) - new Date(racesByMonth[b][0].date)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your season...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Season Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Plan your race calendar for the season</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Race
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{races.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Races</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {races.filter(r => r.status === 'confirmed').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Confirmed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {races.filter(r => r.status === 'provisional').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Provisional</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {races.filter(r => r.priority === 'A').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">A Priority</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Race Calendar */}
      {races.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Races Planned</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start planning your season by adding your target races
              </p>
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
                Add Your First Race
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map(month => (
            <Card key={month}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {month}
                </CardTitle>
                <CardDescription>{racesByMonth[month].length} race{racesByMonth[month].length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {racesByMonth[month].map(race => (
                    <div 
                      key={race.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{race.name}</h4>
                            {getPriorityBadge(race.priority)}
                            {getStatusBadge(race.status)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(race.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            {race.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {race.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Tag className="w-4 h-4" />
                              {getRaceTypeLabel(race.race_type)}
                              {race.distance && ` • ${race.distance}km`}
                            </div>
                          </div>
                          {race.notes && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 italic">
                              {race.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(race)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(race.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                {editingRace ? 'Edit Race' : 'Add New Race'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Race Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Race Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Tour of California"
                  />
                </div>

                {/* Date and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="provisional">Provisional</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </div>
                </div>

                {/* Location and Distance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Distance (km)
                    </label>
                    <input
                      type="number"
                      value={formData.distance}
                      onChange={(e) => setFormData({...formData, distance: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>

                {/* Race Type and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Race Type
                    </label>
                    <select
                      value={formData.raceType}
                      onChange={(e) => setFormData({...formData, raceType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="road_race">Road Race</option>
                      <option value="criterium">Criterium</option>
                      <option value="time_trial">Time Trial</option>
                      <option value="gran_fondo">Gran Fondo</option>
                      <option value="stage_race">Stage Race</option>
                      <option value="gravel">Gravel</option>
                      <option value="cyclocross">Cyclocross</option>
                      <option value="track">Track</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="A">A - Key Race</option>
                      <option value="B">B - Important</option>
                      <option value="C">C - Training/Fun</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows="3"
                    placeholder="Any additional notes about this race..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingRace ? 'Update Race' : 'Add Race'}
                  </Button>
                  <Button type="button" onClick={handleCloseModal} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonPlanner;
