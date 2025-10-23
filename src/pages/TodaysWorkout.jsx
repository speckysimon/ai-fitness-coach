import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Zap, TrendingUp, ChevronLeft, ChevronRight, Home, Target, Heart, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const TodaysWorkout = () => {
  const [plan, setPlan] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [allSessions, setAllSessions] = useState([]);
  const [ftp, setFtp] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load plan from localStorage
    const storedPlan = localStorage.getItem('training_plan');
    if (storedPlan) {
      const parsedPlan = JSON.parse(storedPlan);
      setPlan(parsedPlan);
      
      // Flatten all sessions with their dates
      const sessions = [];
      parsedPlan.weeks.forEach((week) => {
        week.sessions.forEach((session, idx) => {
          sessions.push({
            ...session,
            weekNumber: week.weekNumber,
            sessionIdx: idx,
            weekFocus: week.focus
          });
        });
      });
      
      // Sort by date
      sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
      setAllSessions(sessions);
      
      // Find today's session or next upcoming session
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let foundIndex = sessions.findIndex(s => {
        const sessionDate = new Date(s.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });
      
      // If no session today, find next upcoming session
      if (foundIndex === -1) {
        foundIndex = sessions.findIndex(s => {
          const sessionDate = new Date(s.date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate > today;
        });
      }
      
      // If still not found, default to first session
      if (foundIndex === -1) foundIndex = 0;
      
      setSessionIndex(foundIndex);
      setCurrentSession(sessions[foundIndex]);
    }
    
    // Load FTP for power calculations
    const cachedMetrics = localStorage.getItem('cached_metrics');
    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      setFtp(metrics.ftp);
    }
  }, []);

  const goToPrevious = () => {
    if (sessionIndex > 0) {
      setSessionIndex(sessionIndex - 1);
      setCurrentSession(allSessions[sessionIndex - 1]);
    }
  };

  const goToNext = () => {
    if (sessionIndex < allSessions.length - 1) {
      setSessionIndex(sessionIndex + 1);
      setCurrentSession(allSessions[sessionIndex + 1]);
    }
  };

  const getSessionTypeColor = (type) => {
    const colors = {
      'Recovery': 'bg-green-100 text-green-800 border-green-300',
      'Endurance': 'bg-blue-100 text-blue-800 border-blue-300',
      'Tempo': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Threshold': 'bg-orange-100 text-orange-800 border-orange-300',
      'VO2Max': 'bg-red-100 text-red-800 border-red-300',
      'Intervals': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const isToday = (date) => {
    const today = new Date();
    const sessionDate = new Date(date);
    return today.toDateString() === sessionDate.toDateString();
  };

  // Calculate zone distributions based on session type (from SessionHoverModal)
  const getZoneBreakdown = (type, duration) => {
    const zones = {
      'Recovery': {
        zones: [
          { name: 'Zone 1-2', power: '< 65% FTP', hr: '< 75% Max', time: duration * 0.9, color: 'bg-green-500' },
          { name: 'Warm-up/Cool-down', power: '50-60% FTP', hr: '60-70% Max', time: duration * 0.1, color: 'bg-blue-500' },
        ],
        mainSet: 'Easy spinning, focus on recovery and leg speed',
      },
      'Endurance': {
        zones: [
          { name: 'Zone 2', power: '56-75% FTP', hr: '70-82% Max', time: duration * 0.8, color: 'bg-green-500' },
          { name: 'Warm-up/Cool-down', power: '< 56% FTP', hr: '< 70% Max', time: duration * 0.2, color: 'bg-blue-500' },
        ],
        mainSet: 'Steady aerobic pace, conversational effort',
      },
      'Tempo': {
        zones: [
          { name: 'Zone 3 (Tempo)', power: '76-90% FTP', hr: '82-89% Max', time: duration * 0.5, color: 'bg-yellow-500' },
          { name: 'Zone 2', power: '56-75% FTP', hr: '70-82% Max', time: duration * 0.3, color: 'bg-green-500' },
          { name: 'Warm-up/Cool-down', power: '< 56% FTP', hr: '< 70% Max', time: duration * 0.2, color: 'bg-blue-500' },
        ],
        mainSet: '2-3 x 15-20min at tempo pace with short recoveries',
      },
      'Threshold': {
        zones: [
          { name: 'Zone 4 (Threshold)', power: '91-105% FTP', hr: '89-94% Max', time: duration * 0.3, color: 'bg-orange-500' },
          { name: 'Zone 2-3', power: '56-90% FTP', hr: '70-89% Max', time: duration * 0.5, color: 'bg-yellow-500' },
          { name: 'Warm-up/Cool-down', power: '< 56% FTP', hr: '< 70% Max', time: duration * 0.2, color: 'bg-blue-500' },
        ],
        mainSet: '3-4 x 8-12min at FTP with equal recovery',
      },
      'VO2Max': {
        zones: [
          { name: 'Zone 5 (VO2Max)', power: '106-120% FTP', hr: '> 94% Max', time: duration * 0.2, color: 'bg-red-500' },
          { name: 'Recovery intervals', power: '< 56% FTP', hr: '< 70% Max', time: duration * 0.4, color: 'bg-blue-500' },
          { name: 'Warm-up/Cool-down', power: '56-75% FTP', hr: '70-82% Max', time: duration * 0.4, color: 'bg-green-500' },
        ],
        mainSet: '5-6 x 3-5min at VO2Max with 3min recovery',
      },
      'Intervals': {
        zones: [
          { name: 'High Intensity', power: '> 105% FTP', hr: '> 89% Max', time: duration * 0.25, color: 'bg-red-500' },
          { name: 'Recovery', power: '< 65% FTP', hr: '< 75% Max', time: duration * 0.45, color: 'bg-blue-500' },
          { name: 'Warm-up/Cool-down', power: '56-75% FTP', hr: '70-82% Max', time: duration * 0.3, color: 'bg-green-500' },
        ],
        mainSet: 'Mixed intervals targeting threshold and above',
      },
    };
    return zones[type] || zones['Endurance'];
  };

  // Recommend Zwift workouts
  const getZwiftRecommendation = (type, duration) => {
    const recommendations = {
      'Recovery': [
        { name: 'The Gorby', duration: 30, description: 'Easy spin in Watopia' },
        { name: 'Recovery Spin', duration: 45, description: 'Low intensity recovery' },
      ],
      'Endurance': [
        { name: 'Long Steady Distance', duration: 90, description: 'Steady Zone 2 endurance' },
        { name: 'Tempus Fugit', duration: 60, description: 'Sustained aerobic effort' },
      ],
      'Tempo': [
        { name: 'SST (Short)', duration: 60, description: 'Sweet Spot intervals' },
        { name: 'SST (Med)', duration: 75, description: 'Extended sweet spot work' },
      ],
      'Threshold': [
        { name: 'FTP Test (shorter)', duration: 45, description: '20min FTP test protocol' },
        { name: 'Over-Unders', duration: 60, description: 'FTP intervals with surges' },
      ],
      'VO2Max': [
        { name: 'Violator', duration: 45, description: 'Hard VO2Max intervals' },
        { name: 'The Hunted', duration: 60, description: 'Mixed high-intensity work' },
      ],
      'Intervals': [
        { name: 'DIRT', duration: 60, description: 'Mixed interval workout' },
        { name: 'The Gorge', duration: 60, description: 'Progressive intervals' },
      ],
    };
    const options = recommendations[type] || recommendations['Endurance'];
    return options.reduce((prev, curr) => 
      Math.abs(curr.duration - duration) < Math.abs(prev.duration - duration) ? curr : prev
    );
  };

  const getPowerTargets = (zone) => {
    if (!ftp) return null;
    const match = zone.power.match(/(\d+)-(\d+)%/);
    if (match) {
      const low = Math.round(ftp * parseInt(match[1]) / 100);
      const high = Math.round(ftp * parseInt(match[2]) / 100);
      return `${low}-${high}W`;
    }
    const singleMatch = zone.power.match(/< (\d+)%/);
    if (singleMatch) {
      return `< ${Math.round(ftp * parseInt(singleMatch[1]) / 100)}W`;
    }
    const aboveMatch = zone.power.match(/> (\d+)%/);
    if (aboveMatch) {
      return `> ${Math.round(ftp * parseInt(aboveMatch[1]) / 100)}W`;
    }
    return null;
  };

  if (!plan || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Training Plan Found</h2>
          <p className="text-gray-600 mb-6">Create a training plan to see your workouts</p>
          <Button onClick={() => navigate('/plan')}>
            Go to Plan Generator
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Today's Workout</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={goToPrevious}
            disabled={sessionIndex === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Session {sessionIndex + 1} of {allSessions.length}
            </p>
          </div>
          
          <Button
            onClick={goToNext}
            disabled={sessionIndex === allSessions.length - 1}
            variant="outline"
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Workout Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                <div>
                  <p className="text-sm opacity-90">
                    {new Date(currentSession.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {isToday(currentSession.date) && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-white bg-opacity-20 rounded text-xs font-semibold">
                      TODAY
                    </span>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${getSessionTypeColor(currentSession.type)}`}>
                {currentSession.type}
              </span>
            </div>
            
            <h2 className="text-3xl font-bold mb-2">{currentSession.title}</h2>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{currentSession.duration} min</span>
              </div>
              <div className="opacity-75">•</div>
              <div>Week {currentSession.weekNumber}: {currentSession.weekFocus}</div>
            </div>
          </div>

          {/* Description */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              {currentSession.description}
            </p>
          </div>

          {/* Main Set */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Main Set
            </h3>
            <p className="text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200 text-lg">
              {getZoneBreakdown(currentSession.type, currentSession.duration).mainSet}
            </p>
          </div>

          {/* Time in Zones */}
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Time in Zones
            </h3>
            <div className="space-y-3">
              {getZoneBreakdown(currentSession.type, currentSession.duration).zones.map((zone, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${zone.color}`} />
                      <span className="font-semibold text-gray-900 text-lg">{zone.name}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {Math.round(zone.time)} min
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>Power: {zone.power}</span>
                      {ftp && getPowerTargets(zone) && (
                        <span className="font-semibold text-blue-600 text-base">
                          ({getPowerTargets(zone)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span>HR: {zone.hr}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          {currentSession.targets && (
            <div className="p-6 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Additional Targets
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                {currentSession.targets}
              </p>
            </div>
          )}

          {/* Zwift Recommendation */}
          <div className="p-6 bg-orange-50 border-t border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-orange-600 font-bold text-xl">Z</span>
              Zwift Workout Recommendation
            </h3>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
              <p className="font-semibold text-lg text-orange-900 mb-2">
                {getZwiftRecommendation(currentSession.type, currentSession.duration).name}
              </p>
              <p className="text-gray-700 mb-3">
                {getZwiftRecommendation(currentSession.type, currentSession.duration).description}
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getZwiftRecommendation(currentSession.type, currentSession.duration).duration} min
                </span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                  {currentSession.type}
                </span>
              </div>
              <div className="pt-3 border-t border-orange-200">
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Search for this workout in Zwift's workout library or use a similar workout 
                    that matches the duration and intensity profile.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Key Points */}
          <div className="p-6 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Points</h3>
            <ul className="text-gray-700 space-y-2 list-disc list-inside">
              {currentSession.targets && <li className="text-lg">{currentSession.targets}</li>}
              <li className="text-lg">Stay hydrated throughout the session</li>
              <li className="text-lg">Focus on smooth, consistent effort</li>
              <li className="text-lg">Listen to your body and adjust if needed</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center pb-6">
          <Button
            onClick={() => navigate('/plan')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
          >
            View Full Training Plan
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TodaysWorkout;
