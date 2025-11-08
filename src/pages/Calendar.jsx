import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import ActivityDetailModal from '../components/ActivityDetailModal';
import SessionHoverModal from '../components/SessionHoverModal';
import logger from '../lib/logger';

const Calendar = ({ stravaTokens, googleTokens }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [activities, setActivities] = useState([]);
  const [plannedSessions, setPlannedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [ftp, setFtp] = useState(null);
  const [raceActivities, setRaceActivities] = useState({});

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth, stravaTokens]);

  // Load race tags when activities change
  useEffect(() => {
    const loadRaceTags = async () => {
      try {
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) return;

        const response = await fetch('/api/race-tags', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          setRaceActivities(data.raceTags || {});
        }
      } catch (error) {
        logger.error('Error loading race tags:', error);
      }
    };
    
    if (activities.length > 0) {
      loadRaceTags();
    }
  }, [activities]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      // Try to use cached activities first
      const cachedActivities = localStorage.getItem('cached_activities_recent');
      
      if (cachedActivities) {
        const allActivities = JSON.parse(cachedActivities);
        // Filter for current month
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        const monthActivities = allActivities.filter(a => {
          const activityDate = new Date(a.date);
          return activityDate >= monthStart && activityDate <= monthEnd;
        });
        
        setActivities(monthActivities);
      } else if (stravaTokens) {
        // Fallback: fetch from API if no cache
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        const after = Math.floor(monthStart.getTime() / 1000);
        const before = Math.floor(monthEnd.getTime() / 1000);

        const response = await fetch(
          `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${after}&before=${before}&per_page=100`
        );
        const data = await response.json();
        setActivities(data);
      }

      // Load planned sessions from local storage (in production, this would come from a database)
      const storedPlan = localStorage.getItem('training_plan');
      if (storedPlan) {
        const plan = JSON.parse(storedPlan);
        const sessions = plan.weeks.flatMap(week => week.sessions);
        setPlannedSessions(sessions);
      }
      
      // Load FTP for session details
      const cachedMetrics = localStorage.getItem('cached_metrics');
      if (cachedMetrics) {
        const metrics = JSON.parse(cachedMetrics);
        setFtp(metrics.ftp);
      }
    } catch (error) {
      logger.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getActivitiesForDay = (day) => {
    return activities.filter(activity => 
      isSameDay(new Date(activity.date), day)
    );
  };

  const getPlannedSessionsForDay = (day) => {
    return plannedSessions.filter(session => 
      session.date && isSameDay(new Date(session.date), day)
    );
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const getDaysInWeek = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const days = viewMode === 'month' ? getDaysInMonth() : getDaysInWeek();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Training Calendar</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Past activities and upcoming planned sessions</p>
          </div>
          
          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-2 sm:gap-4 justify-center sm:justify-start">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={viewMode === 'month' ? previousMonth : previousWeek} 
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white min-w-[180px] sm:min-w-[240px] text-center">
            {viewMode === 'month' 
              ? format(currentMonth, 'MMMM yyyy')
              : `${format(startOfWeek(currentWeek), 'MMM d')} - ${format(endOfWeek(currentWeek), 'MMM d, yyyy')}`
            }
          </h2>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={viewMode === 'month' ? nextMonth : nextWeek} 
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border-2 border-green-500 rounded flex-shrink-0"></div>
          <span className="text-gray-700 dark:text-gray-300">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border-2 border-blue-500 rounded flex-shrink-0"></div>
          <span className="text-gray-700 dark:text-gray-300">Planned</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 py-1 sm:py-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 1)}</span>
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty cells for days before month starts (month view only) */}
                {viewMode === 'month' && Array.from({ length: days[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Calendar days */}
                {days.map(day => {
                  const dayActivities = getActivitiesForDay(day);
                  const dayPlanned = getPlannedSessionsForDay(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`${viewMode === 'month' ? 'aspect-square' : 'min-h-[120px] sm:min-h-[150px]'} border rounded-lg p-1 sm:p-2 ${
                        isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'
                      } ${viewMode === 'month' && !isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
                    >
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-0.5 sm:mb-1">
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {/* Completed activities */}
                        {dayActivities.map((activity, idx) => {
                          const isRace = raceActivities[activity.id];
                          return (
                            <div
                              key={`activity-${idx}`}
                              className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate border cursor-pointer transition-colors flex items-center gap-0.5 sm:gap-1 min-h-[24px] sm:min-h-[28px] ${
                                isRace 
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-500 hover:bg-yellow-200' 
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-900/40'
                              }`}
                              title={activity.name}
                              onClick={() => setSelectedActivity(activity)}
                            >
                              {isRace ? (
                                <Trophy className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                              ) : (
                                <span className="text-[10px] sm:text-xs">✓</span>
                              )}
                              <span className="truncate hidden sm:inline">{activity.type}</span>
                              <span className="truncate sm:hidden">{activity.type.slice(0, 3)}</span>
                            </div>
                          );
                        })}
                        {/* Planned sessions */}
                        {dayPlanned.map((session, idx) => {
                          const isCancelled = session.status === 'cancelled';
                          const isModified = session.modified;
                          
                          return (
                            <div
                              key={`planned-${idx}`}
                              className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate border cursor-pointer transition-colors min-h-[24px] sm:min-h-[28px] flex items-center gap-0.5 sm:gap-1 ${
                                isCancelled 
                                  ? 'bg-red-100 text-red-700 border-red-500 line-through hover:bg-red-200'
                                  : isModified
                                  ? 'bg-orange-100 text-orange-700 border-orange-500 hover:bg-orange-200'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-500 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/40'
                              }`}
                              title={isCancelled ? `Cancelled: ${session.cancellationReason || 'Recovery needed'}` : isModified ? `Modified: ${session.modificationReason || 'Plan adjusted'}` : session.title}
                              onClick={() => setSelectedSession(session)}
                            >
                              <span className="text-[10px] sm:text-xs flex-shrink-0">{isCancelled ? '❌' : isModified ? '⚠️' : '📅'}</span>
                              <span className="truncate hidden sm:inline">{session.type}</span>
                              <span className="truncate sm:hidden">{session.type.slice(0, 3)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">This Month</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activities.length}</div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Activities completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Total Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(activities.reduce((sum, a) => sum + (a.duration || 0), 0) / 3600)}h
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Training hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Total Distance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000)} km
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Covered this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
      
      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionHoverModal
          session={selectedSession}
          ftp={ftp}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default Calendar;
