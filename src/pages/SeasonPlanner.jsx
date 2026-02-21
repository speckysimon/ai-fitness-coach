import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Edit2, Trash2, MapPin, Trophy, Tag, CheckCircle, Clock, AlertCircle, Upload, Download, Mountain, Link as LinkIcon, DollarSign, List, Grid3X3, ChevronLeft, ChevronRight, Zap, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, getDay } from 'date-fns';
import logger from '../lib/logger';

/**
 * Calculate estimated TSS (Training Stress Score) for a race based on distance, elevation, and race type.
 * 
 * Research basis:
 * - TSS = (duration_hours × IF² × 100) where IF = Intensity Factor
 * - For races, we estimate duration from distance and typical speeds
 * - Elevation adds ~10% TSS per 1000m gained (climbing penalty)
 * - Race type affects intensity factor (crits are higher intensity than gran fondos)
 * 
 * References:
 * - Coggan, A. (2003). Training and Racing Using a Power Meter
 * - Allen, H., & Coggan, A. (2010). Training and Racing with a Power Meter
 * - Typical race intensities: TT ~1.05 IF, Crit ~0.95 IF, Road Race ~0.85 IF, Gran Fondo ~0.75 IF
 */
const calculateEstimatedTSS = (distance, elevation, raceType) => {
  // Return null if we don't have enough data
  if (!distance || distance <= 0) return null;
  
  // Base speeds (km/h) and intensity factors by race type
  const raceTypeParams = {
    time_trial: { speed: 40, intensityFactor: 1.05, label: 'Time Trial' },
    criterium: { speed: 38, intensityFactor: 0.95, label: 'Criterium' },
    road_race: { speed: 35, intensityFactor: 0.85, label: 'Road Race' },
    stage_race: { speed: 35, intensityFactor: 0.88, label: 'Stage Race' },
    gravel: { speed: 25, intensityFactor: 0.80, label: 'Gravel' },
    cyclocross: { speed: 22, intensityFactor: 0.92, label: 'Cyclocross' },
    gran_fondo: { speed: 28, intensityFactor: 0.75, label: 'Gran Fondo' },
    track: { speed: 45, intensityFactor: 0.98, label: 'Track' },
    other: { speed: 30, intensityFactor: 0.80, label: 'Other' }
  };
  
  const params = raceTypeParams[raceType] || raceTypeParams.other;
  
  // Adjust speed for elevation (reduce speed by ~2% per 100m/10km of climbing)
  const elevationPenalty = elevation ? (elevation / distance) * 0.2 : 0;
  const adjustedSpeed = params.speed * (1 - Math.min(elevationPenalty, 0.3)); // Cap at 30% reduction
  
  // Calculate duration in hours
  const durationHours = distance / adjustedSpeed;
  
  // Calculate base TSS: duration × IF² × 100
  let tss = durationHours * Math.pow(params.intensityFactor, 2) * 100;
  
  // Add climbing penalty: +10% TSS per 1000m elevation
  if (elevation && elevation > 0) {
    const climbingBonus = (elevation / 1000) * 0.10;
    tss *= (1 + climbingBonus);
  }
  
  return Math.round(tss);
};

/**
 * Get TSS category for color coding
 */
const getTSSCategory = (tss) => {
  if (!tss) return null;
  if (tss < 100) return { label: 'Low', color: 'green', description: 'Recovery-friendly' };
  if (tss < 200) return { label: 'Moderate', color: 'yellow', description: 'Standard training load' };
  if (tss < 300) return { label: 'High', color: 'orange', description: 'Significant stress' };
  return { label: 'Very High', color: 'red', description: 'Major event, plan recovery' };
};

const SeasonPlanner = () => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRace, setEditingRace] = useState(null);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTSSInfo, setShowTSSInfo] = useState(false);
  const [showLoadSummary, setShowLoadSummary] = useState(false);
  const [showCostSummary, setShowCostSummary] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null); // null, 'confirmed', 'provisional', 'A', 'B'
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    distance: '',
    elevation: '',
    url: '',
    entryFee: '',
    raceType: 'road_race',
    status: 'provisional',
    priority: 'B',
    isTeamRace: false,
    targetOutcome: '',
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

      // Prepare data - extract single letter from priority
      const dataToSend = {
        ...formData,
        priority: formData.priority.charAt(0).toUpperCase() // Extract just "A" or "B" or "C"
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(dataToSend)
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
      elevation: race.elevation || '',
      url: race.url || '',
      entryFee: race.entry_fee || '',
      raceType: race.race_type || 'road_race',
      status: race.status || 'provisional',
      priority: race.priority || 'B',
      isTeamRace: race.is_team_race || false,
      targetOutcome: race.target_outcome || '',
      notes: race.notes || ''
    });
    setShowAddModal(true);
  };

  // Filter races based on active filter
  const filteredRaces = useMemo(() => {
    if (!activeFilter) return races;
    if (activeFilter === 'confirmed' || activeFilter === 'provisional') {
      return races.filter(r => r.status === activeFilter);
    }
    if (activeFilter === 'A' || activeFilter === 'B') {
      return races.filter(r => r.priority === activeFilter);
    }
    return races;
  }, [races, activeFilter]);

  const handleFilterClick = (filter) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingRace(null);
    setFormData({
      name: '',
      date: '',
      location: '',
      distance: '',
      elevation: '',
      url: '',
      entryFee: '',
      raceType: 'road_race',
      status: 'provisional',
      priority: 'B',
      isTeamRace: false,
      targetOutcome: '',
      notes: ''
    });
  };

  const handleCSVExport = () => {
    if (races.length === 0) {
      alert('No races to export');
      return;
    }

    // Create CSV header
    const headers = [
      'name',
      'date',
      'location',
      'distance',
      'elevation',
      'url',
      'entryFee',
      'raceType',
      'status',
      'priority',
      'isTeamRace',
      'notes'
    ];

    // Create CSV rows
    const rows = races.map(race => [
      race.name || '',
      race.date || '',
      race.location || '',
      race.distance || '',
      race.elevation || '',
      race.url || '',
      race.entry_fee || '',
      race.race_type || 'road_race',
      race.status || 'provisional',
      race.priority || 'B',
      race.is_team_race ? 'true' : 'false',
      race.notes || ''
    ]);

    // Combine header and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `season-races-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper function to parse CSV line handling quoted fields
  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    values.push(current.trim());
    return values;
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have a header row and at least one data row');
        setImporting(false);
        return;
      }

      // Parse header using proper CSV parser
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      
      // Expected headers: name, date, location, distance, elevation, url, entryFee, raceType, status, priority, notes
      const requiredHeaders = ['name', 'date'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        alert(`CSV must include these columns: ${missingHeaders.join(', ')}`);
        setImporting(false);
        return;
      }

      // Parse data rows
      const racesToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const race = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          // Map CSV headers to formData keys
          const headerMap = {
            'name': 'name',
            'date': 'date',
            'location': 'location',
            'distance': 'distance',
            'elevation': 'elevation',
            'url': 'url',
            'entryfee': 'entryFee',
            'entry_fee': 'entryFee',
            'racetype': 'raceType',
            'race_type': 'raceType',
            'type': 'raceType',
            'status': 'status',
            'priority': 'priority',
            'isteamrace': 'isTeamRace',
            'is_team_race': 'isTeamRace',
            'teamrace': 'isTeamRace',
            'team': 'isTeamRace',
            'notes': 'notes'
          };
          
          const key = headerMap[header];
          if (key) {
            // Handle boolean conversion for isTeamRace
            if (key === 'isTeamRace') {
              value = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1';
            }
            // Extract single letter from priority (e.g., "B - Important" -> "B")
            else if (key === 'priority' && value.length > 1) {
              value = value.charAt(0).toUpperCase();
            }
            // Normalize status to lowercase
            else if (key === 'status') {
              value = value.toLowerCase();
            }
            
            race[key] = value;
          }
        });

        // Set defaults for missing fields
        if (!race.raceType) race.raceType = 'road_race';
        if (!race.status) race.status = 'provisional';
        if (!race.priority) race.priority = 'B';
        if (race.isTeamRace === undefined) race.isTeamRace = false;

        racesToImport.push(race);
      }

      // Import races to backend
      const sessionToken = localStorage.getItem('session_token');
      let successCount = 0;
      let errorCount = 0;

      for (const race of racesToImport) {
        try {
          const response = await fetch('/api/season-races', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(race)
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            logger.error('Failed to import race:', race.name);
          }
        } catch (error) {
          errorCount++;
          logger.error('Error importing race:', race.name, error);
        }
      }

      await loadRaces();
      alert(`Import complete!\nSuccessfully imported: ${successCount}\nFailed: ${errorCount}`);
      
    } catch (error) {
      logger.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset file input
    }
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

  // Group races by month (use filteredRaces for filter support)
  const racesByMonth = filteredRaces.reduce((acc, race) => {
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
            Season Planner
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Plan your race calendar for the season</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
          <button
            onClick={handleCSVExport}
            disabled={races.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Export</span>
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg cursor-pointer transition-colors min-h-[44px]">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">{importing ? 'Importing...' : 'Import'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={importing}
              className="hidden"
            />
          </label>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 min-h-[44px]">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Race</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activeFilter === null ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
          onClick={() => handleFilterClick(null)}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{races.length}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Total Races</div>
              {activeFilter === null && <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Active</div>}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activeFilter === 'confirmed' ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}
          onClick={() => handleFilterClick('confirmed')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {races.filter(r => r.status === 'confirmed').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Confirmed</div>
              {activeFilter === 'confirmed' && <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">Active</div>}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activeFilter === 'provisional' ? 'ring-2 ring-yellow-500 dark:ring-yellow-400' : ''}`}
          onClick={() => handleFilterClick('provisional')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {races.filter(r => r.status === 'provisional').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Provisional</div>
              {activeFilter === 'provisional' && <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">Active</div>}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`group relative cursor-pointer transition-all hover:shadow-lg ${activeFilter === 'A' ? 'ring-2 ring-red-500 dark:ring-red-400' : ''}`}
          onClick={() => handleFilterClick('A')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                {races.filter(r => r.priority === 'A').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Peak Races</div>
              {activeFilter === 'A' && <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Active</div>}
            </div>
            {/* Tooltip */}
            {races.filter(r => r.priority === 'A').length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-64">
                <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg p-3">
                  <div className="font-semibold mb-2 text-red-400">Peak Races (A)</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {filteredRaces
                      .filter(r => r.priority === 'A')
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((race, idx) => (
                        <div key={idx} className="flex justify-between gap-2 text-gray-200">
                          <span className="truncate">{race.name}</span>
                          <span className="text-gray-400 whitespace-nowrap">
                            {format(new Date(race.date), 'MMM d')}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card 
          className={`group relative cursor-pointer transition-all hover:shadow-lg ${activeFilter === 'B' ? 'ring-2 ring-orange-500 dark:ring-orange-400' : ''}`}
          onClick={() => handleFilterClick('B')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                {races.filter(r => r.priority === 'B').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Important Races</div>
              {activeFilter === 'B' && <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">Active</div>}
            </div>
            {/* Tooltip */}
            {races.filter(r => r.priority === 'B').length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-64">
                <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg p-3">
                  <div className="font-semibold mb-2 text-orange-400">Important Races (B)</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {races
                      .filter(r => r.priority === 'B')
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((race, idx) => (
                        <div key={idx} className="flex justify-between gap-2 text-gray-200">
                          <span className="truncate">{race.name}</span>
                          <span className="text-gray-400 whitespace-nowrap">
                            {format(new Date(race.date), 'MMM d')}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Racing Load Summary */}
      {races.length > 0 && (() => {
        // Calculate monthly racing load
        const monthlyLoad = races.reduce((acc, race) => {
          const monthKey = format(new Date(race.date), 'yyyy-MM');
          const monthLabel = format(new Date(race.date), 'MMM yyyy');
          const tss = calculateEstimatedTSS(race.distance, race.elevation, race.race_type);
          
          if (!acc[monthKey]) {
            acc[monthKey] = {
              label: monthLabel,
              totalTSS: 0,
              raceCount: 0,
              races: []
            };
          }
          
          acc[monthKey].raceCount++;
          if (tss) {
            acc[monthKey].totalTSS += tss;
          }
          acc[monthKey].races.push(race);
          
          return acc;
        }, {});

        // Sort by month chronologically
        const sortedMonths = Object.keys(monthlyLoad).sort();
        
        // Determine load categories for color coding
        const getLoadCategory = (totalTSS) => {
          if (totalTSS === 0) return { color: 'gray', label: 'Unknown', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-600' };
          if (totalTSS < 300) return { color: 'green', label: 'Light', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-600' };
          if (totalTSS < 600) return { color: 'yellow', label: 'Moderate', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-600' };
          if (totalTSS < 900) return { color: 'orange', label: 'Heavy', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-600' };
          return { color: 'red', label: 'Very Heavy', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-600' };
        };

        return (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLoadSummary(!showLoadSummary)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={showLoadSummary ? "Collapse" : "Expand"}
                  >
                    {showLoadSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Monthly Racing Load
                  </CardTitle>
                </div>
                <button
                  onClick={() => setShowTSSInfo(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Learn about TSS"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Total estimated Training Stress Score (TSS) per month · Estimates update automatically when races change
              </CardDescription>
            </CardHeader>
            {showLoadSummary && (
              <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {sortedMonths.map((monthKey, idx) => {
                  const data = monthlyLoad[monthKey];
                  const category = getLoadCategory(data.totalTSS);
                  
                  // Count priority races
                  const aRaces = data.races.filter(r => r.priority === 'A');
                  const bRaces = data.races.filter(r => r.priority === 'B');
                  
                  // Check for warnings
                  const isHeavy = category.label === 'Heavy' || category.label === 'Very Heavy';
                  const prevMonth = idx > 0 ? monthlyLoad[sortedMonths[idx - 1]] : null;
                  const prevIsHeavy = prevMonth && (getLoadCategory(prevMonth.totalTSS).label === 'Heavy' || getLoadCategory(prevMonth.totalTSS).label === 'Very Heavy');
                  const adjacentHeavyWarning = isHeavy && prevIsHeavy;
                  const veryHeavyNoA = category.label === 'Very Heavy' && aRaces.length === 0;
                  
                  // Generate explanation with varied wording
                  let explanation = '';
                  if (aRaces.length > 0) {
                    // Vary single A race wording to avoid repetition
                    const singleAVariants = ['Anchored by A race', 'A race defines the month'];
                    explanation = aRaces.length === 1 
                      ? singleAVariants[idx % singleAVariants.length]
                      : `${aRaces.length} A races`;
                  } else if (bRaces.length > 0) {
                    explanation = bRaces.length === 1 ? '1 B race' : `${bRaces.length} B races`;
                  } else if (data.raceCount > 0) {
                    // Context-aware wording based on load
                    if (isHeavy) {
                      explanation = data.raceCount === 1 ? 'High stress from single race' : 'Single high-load event';
                    } else {
                      explanation = 'Low race density';
                    }
                  }
                  
                  return (
                    <div
                      key={monthKey}
                      className={`p-3 rounded-lg border-2 ${category.bg} ${category.border} transition-all hover:shadow-md relative cursor-pointer`}
                      onClick={() => {
                        // Scroll to this month in list/calendar view
                        const monthElement = document.getElementById(`month-${monthKey}`);
                        if (monthElement) {
                          monthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      title="Click to jump to this month"
                    >
                      {/* Warning icon */}
                      {(adjacentHeavyWarning || veryHeavyNoA) && (
                        <div className="absolute -top-2 -right-2">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 rounded-full" />
                        </div>
                      )}
                      
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {data.label}
                      </div>
                      <div className={`text-2xl font-bold ${category.text} mb-1`}>
                        {data.totalTSS > 0 ? `~${data.totalTSS}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.raceCount} race{data.raceCount !== 1 ? 's' : ''}
                      </div>
                      
                      {/* Priority badges with tooltips */}
                      {(aRaces.length > 0 || bRaces.length > 0) && (
                        <div className="flex gap-1 mt-2">
                          {aRaces.length > 0 && (
                            <span 
                              className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs rounded font-medium cursor-help"
                              title="Peak race month – freshness protected"
                            >
                              A
                            </span>
                          )}
                          {bRaces.length > 0 && (
                            <span 
                              className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-xs rounded font-medium cursor-help"
                              title="Important race month – limited taper"
                            >
                              B
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Explanation */}
                      {explanation && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                          {explanation}
                        </div>
                      )}
                      
                      {data.totalTSS > 0 && (
                        <div className={`text-xs font-medium mt-1 ${category.text}`}>
                          {category.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Load Legend */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Light (&lt;300)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Moderate (300-600)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Heavy (600-900)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Very Heavy (&gt;900)</span>
                  </div>
                </div>
              </div>
              </CardContent>
            )}
          </Card>
        );
      })()}

      {/* Season Sanity Check */}
      {races.length > 0 && (() => {
        const aRaces = races.filter(r => r.priority === 'A').sort((a, b) => new Date(a.date) - new Date(b.date));
        const checks = [];
        
        // Add neutral info line about peak races
        if (aRaces.length > 0) {
          checks.push({ 
            type: 'info', 
            message: `${aRaces.length} Peak race${aRaces.length !== 1 ? 's' : ''} across the season` 
          });
        }
        
        // Check 1: Peak race spacing (minimum 4 weeks recommended)
        if (aRaces.length >= 2) {
          let wellSpaced = true;
          for (let i = 1; i < aRaces.length; i++) {
            const daysBetween = Math.floor((new Date(aRaces[i].date) - new Date(aRaces[i-1].date)) / (1000 * 60 * 60 * 24));
            if (daysBetween < 28) { // Less than 4 weeks
              wellSpaced = false;
              const weeksApart = Math.floor(daysBetween/7);
              const weekText = weeksApart === 1 ? '1 week' : `${weeksApart} weeks`;
              checks.push({
                type: 'warning',
                message: `Two Peak races only ${weekText} apart (${aRaces[i-1].name} → ${aRaces[i].name})`
              });
            }
          }
          if (wellSpaced) {
            checks.push({ type: 'success', message: 'Peak races spaced well (4+ weeks)' });
          }
        }
        
        // Check 2: Identify consecutive heavy months
        const monthlyLoad = races.reduce((acc, race) => {
          const monthKey = format(new Date(race.date), 'yyyy-MM');
          const monthLabel = format(new Date(race.date), 'MMM yyyy');
          const tss = calculateEstimatedTSS(race.distance, race.elevation, race.race_type);
          if (!acc[monthKey]) {
            acc[monthKey] = { label: monthLabel, totalTSS: 0, races: [] };
          }
          if (tss) acc[monthKey].totalTSS += tss;
          acc[monthKey].races.push(race);
          return acc;
        }, {});
        
        const sortedMonths = Object.keys(monthlyLoad).sort();
        let consecutiveHeavy = [];
        for (let i = 0; i < sortedMonths.length; i++) {
          const tss = monthlyLoad[sortedMonths[i]].totalTSS;
          if (tss >= 600) { // Heavy or Very Heavy
            if (i > 0 && monthlyLoad[sortedMonths[i-1]].totalTSS >= 600) {
              if (consecutiveHeavy.length === 0 || consecutiveHeavy[consecutiveHeavy.length - 1] !== monthlyLoad[sortedMonths[i-1]].label) {
                consecutiveHeavy.push(monthlyLoad[sortedMonths[i-1]].label);
              }
              consecutiveHeavy.push(monthlyLoad[sortedMonths[i]].label);
            }
          }
        }
        
        if (consecutiveHeavy.length > 0) {
          const uniqueMonths = [...new Set(consecutiveHeavy)];
          checks.push({
            type: 'warning',
            message: `Heavy load in ${uniqueMonths.join(', ')}`
          });
        }
        
        // Check 3: Identify recovery periods (light months after heavy)
        for (let i = 1; i < sortedMonths.length; i++) {
          const prevTSS = monthlyLoad[sortedMonths[i-1]].totalTSS;
          const currTSS = monthlyLoad[sortedMonths[i]].totalTSS;
          if (prevTSS >= 600 && currTSS < 300) {
            checks.push({
              type: 'success',
              message: `${monthlyLoad[sortedMonths[i]].label} allows recovery after heavy period`
            });
          }
        }
        
        // Check 4: No recovery after heavy months
        for (let i = 0; i < sortedMonths.length - 1; i++) {
          const currTSS = monthlyLoad[sortedMonths[i]].totalTSS;
          const nextTSS = monthlyLoad[sortedMonths[i+1]].totalTSS;
          if (currTSS >= 900 && nextTSS >= 600) { // Very heavy followed by heavy+
            checks.push({
              type: 'warning',
              message: `No recovery planned after ${monthlyLoad[sortedMonths[i]].label}`
            });
          }
        }
        
        if (checks.length === 0) {
          checks.push({ type: 'success', message: 'Season plan looks balanced' });
        }
        
        // Reorder by severity: Warnings → Positives → Context
        const orderedChecks = [
          ...checks.filter(c => c.type === 'warning'),
          ...checks.filter(c => c.type === 'success'),
          ...checks.filter(c => c.type === 'info')
        ];
        
        return (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Season Sanity Check
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Intelligent analysis of your season structure
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                {orderedChecks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    {check.type === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    )}
                    {check.type === 'warning' && (
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    )}
                    {check.type === 'info' && (
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      check.type === 'success' ? 'text-green-700 dark:text-green-400' :
                      check.type === 'warning' ? 'text-orange-700 dark:text-orange-400' :
                      'text-blue-700 dark:text-blue-400'
                    }`}>
                      {check.message}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Monthly Racing Costs Summary */}
      {races.length > 0 && (() => {
        // Calculate monthly racing costs
        const monthlyCosts = races.reduce((acc, race) => {
          const monthKey = format(new Date(race.date), 'yyyy-MM');
          const monthLabel = format(new Date(race.date), 'MMM yyyy');
          
          if (!acc[monthKey]) {
            acc[monthKey] = {
              label: monthLabel,
              totalCost: 0,
              raceCount: 0,
              races: []
            };
          }
          
          acc[monthKey].raceCount++;
          
          // Parse entry fee - handle various formats (€50, $100, 50, etc.)
          if (race.entry_fee) {
            const feeStr = String(race.entry_fee).replace(/[€$£,]/g, '').trim();
            const fee = parseFloat(feeStr);
            if (!isNaN(fee)) {
              acc[monthKey].totalCost += fee;
            }
          }
          acc[monthKey].races.push(race);
          
          return acc;
        }, {});

        // Sort by month chronologically
        const sortedMonths = Object.keys(monthlyCosts).sort();
        
        // Determine cost categories for color coding
        const getCostCategory = (totalCost) => {
          if (totalCost === 0) return { color: 'gray', label: 'Unknown', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-600' };
          if (totalCost < 100) return { color: 'green', label: 'Low', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-600' };
          if (totalCost < 300) return { color: 'yellow', label: 'Moderate', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-600' };
          if (totalCost < 500) return { color: 'orange', label: 'High', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-600' };
          return { color: 'red', label: 'Very High', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-600' };
        };

        // Calculate total season cost
        const totalSeasonCost = Object.values(monthlyCosts).reduce((sum, month) => sum + month.totalCost, 0);

        return (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCostSummary(!showCostSummary)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={showCostSummary ? "Collapse" : "Expand"}
                  >
                    {showCostSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Monthly Racing Costs
                  </CardTitle>
                </div>
                {totalSeasonCost > 0 && (
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Season Total: €{totalSeasonCost.toFixed(0)}
                  </div>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Total entry fees per month
              </CardDescription>
            </CardHeader>
            {showCostSummary && (
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {sortedMonths.map(monthKey => {
                    const data = monthlyCosts[monthKey];
                    const category = getCostCategory(data.totalCost);
                    
                    // Find highest cost race and its priority
                    let priorityContext = '';
                    if (data.races.length > 0) {
                      const racesWithFees = data.races.filter(r => {
                        const feeStr = String(r.entry_fee || '').replace(/[€$£,]/g, '').trim();
                        const fee = parseFloat(feeStr);
                        return !isNaN(fee) && fee > 0;
                      });
                      
                      if (racesWithFees.length > 0) {
                        const highestCostRace = racesWithFees.reduce((max, race) => {
                          const feeStr = String(race.entry_fee).replace(/[€$£,]/g, '').trim();
                          const fee = parseFloat(feeStr);
                          const maxFeeStr = String(max.entry_fee).replace(/[€$£,]/g, '').trim();
                          const maxFee = parseFloat(maxFeeStr);
                          return fee > maxFee ? race : max;
                        });
                        
                        const feeStr = String(highestCostRace.entry_fee).replace(/[€$£,]/g, '').trim();
                        const fee = parseFloat(feeStr);
                        priorityContext = `€${fee.toFixed(0)} (${highestCostRace.priority} race)`;
                      }
                    }
                    
                    return (
                      <div
                        key={monthKey}
                        className={`p-3 rounded-lg border-2 ${category.bg} ${category.border} transition-all hover:shadow-md`}
                      >
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {data.label}
                        </div>
                        <div className={`text-2xl font-bold ${category.text} mb-1`}>
                          €{data.totalCost.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {data.raceCount} race{data.raceCount !== 1 ? 's' : ''}
                        </div>
                        {priorityContext && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                            {priorityContext}
                          </div>
                        )}
                        {data.totalCost > 0 && (
                          <div className={`text-xs font-medium mt-1 ${category.text}`}>
                            {category.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Cost Legend and Distribution Note */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-3 text-xs mb-3">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">Low (&lt;€100)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-yellow-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">Moderate (€100-300)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">High (€300-500)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">Very High (&gt;€500)</span>
                    </div>
                  </div>
                  {/* Cost distribution note */}
                  {(() => {
                    const aRaceCosts = races.filter(r => r.priority === 'A' && r.entry_fee).reduce((sum, r) => {
                      const feeStr = String(r.entry_fee).replace(/[€$£,]/g, '').trim();
                      const fee = parseFloat(feeStr);
                      return sum + (isNaN(fee) ? 0 : fee);
                    }, 0);
                    const totalCosts = races.reduce((sum, r) => {
                      if (!r.entry_fee) return sum;
                      const feeStr = String(r.entry_fee).replace(/[€$£,]/g, '').trim();
                      const fee = parseFloat(feeStr);
                      return sum + (isNaN(fee) ? 0 : fee);
                    }, 0);
                    
                    if (totalCosts > 0) {
                      const aRacePercentage = (aRaceCosts / totalCosts) * 100;
                      const note = aRacePercentage > 60 
                        ? 'Costs concentrated in A races' 
                        : 'Costs evenly distributed';
                      
                      return (
                        <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {note}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })()}

      {/* Race Calendar/List */}
      {races.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-12">
            <div className="text-center">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Races Planned</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                Start planning your season by adding your target races
              </p>
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 mx-auto min-h-[44px]">
                <Plus className="w-4 h-4" />
                Add Your First Race
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
              {/* Calendar Days */}
              {(() => {
                const monthStart = startOfMonth(currentMonth);
                const monthEnd = endOfMonth(currentMonth);
                const calendarStart = startOfWeek(monthStart);
                const calendarEnd = endOfWeek(monthEnd);
                const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                
                return days.map(day => {
                  const dayRaces = filteredRaces.filter(race => isSameDay(new Date(race.date), day));
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[100px] sm:min-h-[120px] p-1.5 border border-gray-100 dark:border-gray-700 rounded-lg ${
                        !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 opacity-50' : 'bg-white dark:bg-gray-800'
                      } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div className={`text-xs font-medium mb-1.5 ${
                        isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1.5">
                        {dayRaces.slice(0, 2).map(race => {
                          const estimatedTSS = calculateEstimatedTSS(race.distance, race.elevation, race.race_type);
                          const tssCategory = getTSSCategory(estimatedTSS);
                          const priorityColors = {
                            A: 'bg-gradient-to-r from-red-500 to-red-600 border-red-600',
                            B: 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600',
                            C: 'bg-gradient-to-r from-gray-400 to-gray-500 border-gray-500'
                          };
                          const priorityBorder = {
                            A: 'border-l-red-400',
                            B: 'border-l-blue-400',
                            C: 'border-l-gray-300'
                          };
                          return (
                            <div
                              key={race.id}
                              onClick={() => handleEdit(race)}
                              className={`text-xs p-1.5 rounded-md cursor-pointer ${priorityColors[race.priority]} text-white hover:shadow-md hover:scale-[1.02] transition-all border border-white/20`}
                              title={`${race.name}${race.location ? ` • ${race.location}` : ''}${estimatedTSS ? ` • Est. TSS: ${estimatedTSS}` : ''}`}
                            >
                              {/* Race Name with Priority Badge */}
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="font-bold text-[10px] bg-white/20 px-1 rounded">{race.priority}</span>
                                <span className="font-semibold truncate text-[11px]">{race.name}</span>
                              </div>
                              
                              {/* Race Details Row */}
                              <div className="flex items-center gap-1.5 text-[9px] opacity-90 flex-wrap">
                                {race.location && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[60px]">{race.location}</span>
                                  </span>
                                )}
                                {race.distance && (
                                  <span className="flex items-center gap-0.5">
                                    <span>{race.distance}km</span>
                                  </span>
                                )}
                                {race.elevation && (
                                  <span className="flex items-center gap-0.5">
                                    <Mountain className="w-2.5 h-2.5" />
                                    <span>{race.elevation}m</span>
                                  </span>
                                )}
                              </div>
                              
                              {/* TSS Badge */}
                              {estimatedTSS && (
                                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/20">
                                  <Zap className="w-2.5 h-2.5" />
                                  <span className="text-[9px] font-medium">~{estimatedTSS} TSS</span>
                                  <span className={`text-[8px] px-1 rounded ${
                                    tssCategory?.color === 'green' ? 'bg-green-400/30' :
                                    tssCategory?.color === 'yellow' ? 'bg-yellow-400/30' :
                                    tssCategory?.color === 'orange' ? 'bg-orange-400/30' :
                                    'bg-red-400/30'
                                  }`}>{tssCategory?.label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dayRaces.length > 2 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700 rounded py-0.5">
                            +{dayRaces.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* TSS Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Priority:</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> A - Key</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> B - Important</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400"></span> C - Training</span>
                </div>
                <button
                  onClick={() => setShowTSSInfo(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Info className="w-3 h-3" />
                  About Estimated TSS
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <div className="space-y-4 sm:space-y-6">
          {sortedMonths.map(month => {
            const monthKey = format(new Date(month), 'yyyy-MM');
            return (
            <Card key={month} id={`month-${monthKey}`}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  {month}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">{racesByMonth[month].length} race{racesByMonth[month].length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3">
                  {racesByMonth[month].map(race => {
                    const estimatedTSS = calculateEstimatedTSS(race.distance, race.elevation, race.race_type);
                    const tssCategory = getTSSCategory(estimatedTSS);
                    
                    return (
                      <div 
                        key={race.id}
                        className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{race.name}</h4>
                              {getPriorityBadge(race.priority)}
                              {getStatusBadge(race.status)}
                              {race.is_team_race && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  Team
                                </span>
                              )}
                              {/* Estimated TSS Badge - reduced visual weight in list view */}
                              {estimatedTSS ? (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium opacity-75 ${
                                  tssCategory?.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                  tssCategory?.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  tssCategory?.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`} title={tssCategory?.description}>
                                  <Zap className="w-3 h-3" />
                                  ~{estimatedTSS}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium opacity-60 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" title="Add distance to calculate estimated TSS">
                                  <Zap className="w-3 h-3" />
                                  n/a
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                              {race.elevation && (
                                <div className="flex items-center gap-1">
                                  <Mountain className="w-4 h-4" />
                                  {race.elevation}m elevation
                                </div>
                              )}
                              {race.entry_fee && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {race.entry_fee}
                                </div>
                              )}
                              {race.url && (
                                <div className="flex items-center gap-1">
                                  <LinkIcon className="w-4 h-4" />
                                  <a 
                                    href={race.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Website
                                  </a>
                                </div>
                              )}
                              {race.registration_deadline && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" />
                                  Reg: {new Date(race.registration_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                            {race.notes && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-2 italic">
                                {race.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:ml-4">
                            <button
                              onClick={() => handleEdit(race)}
                              className="p-2 sm:p-2.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(race.id)}
                              className="p-2 sm:p-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
      
      {/* TSS Info Modal */}
      {showTSSInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTSSInfo(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Estimated TSS Calculation
              </h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-gray-900 dark:text-gray-100">Training Stress Score (TSS)</strong> estimates the physiological 
                  stress of a race based on duration and intensity.
                </p>
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">Formula:</strong>
                  <p className="mt-1 font-mono text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    TSS = Duration (hours) × Intensity Factor² × 100
                  </p>
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">Factors considered:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li><strong>Distance:</strong> Used to estimate duration based on typical race speeds</li>
                    <li><strong>Elevation:</strong> Adds ~10% TSS per 1000m gained (climbing penalty)</li>
                    <li><strong>Race Type:</strong> Different events have different intensity factors</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">Intensity by Race Type:</strong>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Time Trial: IF 1.05</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Track: IF 0.98</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Criterium: IF 0.95</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Cyclocross: IF 0.92</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Stage Race: IF 0.88</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Road Race: IF 0.85</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Gravel: IF 0.80</div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">Gran Fondo: IF 0.75</div>
                  </div>
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">TSS Categories:</strong>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500"></span> &lt;100: Low (recovery-friendly)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-500"></span> 100-200: Moderate (standard load)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-orange-500"></span> 200-300: High (significant stress)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span> &gt;300: Very High (plan recovery)</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                  References: Coggan, A. (2003). Training and Racing Using a Power Meter; 
                  Allen, H., & Coggan, A. (2010). Training and Racing with a Power Meter
                </p>
              </div>
              <button
                onClick={() => setShowTSSInfo(false)}
                className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editingRace ? 'Edit Race' : 'Add New Race'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px]"
                    placeholder="e.g., Tour of California"
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="A">A - Peak Race</option>
                      <option value="B">B - Important Race</option>
                      <option value="C">C - Secondary Race</option>
                    </select>
                  </div>
                </div>

                {/* Team/Individual Toggle */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTeamRace}
                      onChange={(e) => setFormData({...formData, isTeamRace: e.target.checked})}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Team Race (check if this is a team event)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    Team races involve coordination with other riders
                  </p>
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

                {/* Elevation and Entry Fee */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <Mountain className="w-4 h-4" />
                      Elevation Gain (m)
                    </label>
                    <input
                      type="number"
                      value={formData.elevation}
                      onChange={(e) => setFormData({...formData, elevation: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., 1500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Entry Fee
                    </label>
                    <input
                      type="text"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({...formData, entryFee: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., €50"
                    />
                  </div>
                </div>

                {/* Race Definition Cluster: Event Date, Race Type, Target Outcome */}
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
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
                      Target Outcome
                    </label>
                    <input
                      type="text"
                      value={formData.targetOutcome}
                      onChange={(e) => setFormData({...formData, targetOutcome: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., Top 10 finish, Complete under 4 hours"
                    />
                  </div>
                </div>

                {/* Race Website URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <LinkIcon className="w-4 h-4" />
                    Race Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="https://..."
                  />
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
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 min-h-[44px]">
                    {editingRace ? 'Update Race' : 'Add Race'}
                  </Button>
                  <Button type="button" onClick={handleCloseModal} variant="outline" className="flex-1 min-h-[44px]">
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
