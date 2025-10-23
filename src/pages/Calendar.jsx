import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import ActivityDetailModal from '../components/ActivityDetailModal';
import SessionHoverModal from '../components/SessionHoverModal';

const Calendar = ({ stravaTokens, googleTokens }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
        console.error('Error loading race tags:', error);
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
      const cachedActivities = localStorage.getItem('cached_activities');
      
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
      console.error('Error loading calendar data:', error);
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

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Calendar</h1>
          <p className="text-gray-600 mt-1">Past activities and upcoming planned sessions</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
          <span className="text-gray-700">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
          <span className="text-gray-700">Planned</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: days[0].getDay() }).map((_, i) => (
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
                      className={`aspect-square border rounded-lg p-2 ${
                        isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      } ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
                    >
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {/* Completed activities */}
                        {dayActivities.map((activity, idx) => {
                          const isRace = raceActivities[activity.id];
                          return (
                            <div
                              key={`activity-${idx}`}
                              className={`text-xs px-2 py-1 rounded truncate border cursor-pointer transition-colors flex items-center gap-1 ${
                                isRace 
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-500 hover:bg-yellow-200' 
                                  : 'bg-green-100 text-green-700 border-green-500 hover:bg-green-200'
                              }`}
                              title={activity.name}
                              onClick={() => setSelectedActivity(activity)}
                            >
                              {isRace ? (
                                <Trophy className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <span>✓</span>
                              )}
                              <span className="truncate">{activity.type}</span>
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
                              className={`text-xs px-2 py-1 rounded truncate border cursor-pointer transition-colors ${
                                isCancelled 
                                  ? 'bg-red-100 text-red-700 border-red-500 line-through hover:bg-red-200'
                                  : isModified
                                  ? 'bg-orange-100 text-orange-700 border-orange-500 hover:bg-orange-200'
                                  : 'bg-blue-100 text-blue-700 border-blue-500 hover:bg-blue-200'
                              }`}
                              title={isCancelled ? `Cancelled: ${session.cancellationReason || 'Recovery needed'}` : isModified ? `Modified: ${session.modificationReason || 'Plan adjusted'}` : session.title}
                              onClick={() => setSelectedSession(session)}
                            >
                              {isCancelled ? '❌' : isModified ? '⚠️' : '📅'} {session.type}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{activities.length}</div>
            <p className="text-sm text-gray-600">Activities completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(activities.reduce((sum, a) => sum + (a.duration || 0), 0) / 3600)}h
            </div>
            <p className="text-sm text-gray-600">Training hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000)} km
            </div>
            <p className="text-sm text-gray-600">Covered this month</p>
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
