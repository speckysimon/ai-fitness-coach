import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Zap, Heart, Target, Info } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

const SessionDetail = ({ session, ftp }) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate zone distributions based on session type
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

  // Recommend Zwift® workouts based on session type
  const getZwiftRecommendation = (type, duration) => {
    const recommendations = {
      'Recovery': [
        { name: 'The Gorby', duration: 30, description: 'Easy spin in Watopia' },
        { name: 'Recovery Spin', duration: 45, description: 'Low intensity recovery' },
      ],
      'Endurance': [
        { name: 'Long Steady Distance', duration: 90, description: 'Steady Zone 2 endurance' },
        { name: 'Tempus Fugit', duration: 60, description: 'Sustained aerobic effort' },
        { name: 'The Wringer', duration: 75, description: 'Mixed endurance work' },
      ],
      'Tempo': [
        { name: 'SST (Short)', duration: 60, description: 'Sweet Spot intervals' },
        { name: 'SST (Med)', duration: 75, description: 'Extended sweet spot work' },
        { name: 'Tempo Bursts', duration: 60, description: 'Tempo with surges' },
      ],
      'Threshold': [
        { name: 'FTP Test (shorter)', duration: 45, description: '20min FTP test protocol' },
        { name: 'Over-Unders', duration: 60, description: 'FTP intervals with surges' },
        { name: 'The Wattbike', duration: 60, description: 'Classic FTP intervals' },
      ],
      'VO2Max': [
        { name: 'Violator', duration: 45, description: 'Hard VO2Max intervals' },
        { name: 'The Hunted', duration: 60, description: 'Mixed high-intensity work' },
        { name: 'Jon\'s Short Mix', duration: 45, description: 'Short hard efforts' },
      ],
      'Intervals': [
        { name: 'DIRT', duration: 60, description: 'Mixed interval workout' },
        { name: 'Zwift 101', duration: 45, description: 'Introduction to intervals' },
        { name: 'The Gorge', duration: 60, description: 'Progressive intervals' },
      ],
    };

    const options = recommendations[type] || recommendations['Endurance'];
    // Find closest duration match
    return options.reduce((prev, curr) => 
      Math.abs(curr.duration - duration) < Math.abs(prev.duration - duration) ? curr : prev
    );
  };

  const breakdown = getZoneBreakdown(session.type, session.duration);
  const zwiftWorkout = getZwiftRecommendation(session.type, session.duration);

  // Calculate power targets if FTP is available
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

  return (
    <Card className="mb-3">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className={`w-2 h-12 rounded ${
              session.type === 'Recovery' ? 'bg-green-500' :
              session.type === 'Endurance' ? 'bg-blue-500' :
              session.type === 'Tempo' ? 'bg-yellow-500' :
              session.type === 'Threshold' ? 'bg-orange-500' :
              session.type === 'VO2Max' ? 'bg-red-500' :
              'bg-purple-500'
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{session.title}</h4>
                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                  session.type === 'Recovery' ? 'bg-green-100 text-green-700' :
                  session.type === 'Endurance' ? 'bg-blue-100 text-blue-700' :
                  session.type === 'Tempo' ? 'bg-yellow-100 text-yellow-700' :
                  session.type === 'Threshold' ? 'bg-orange-100 text-orange-700' :
                  session.type === 'VO2Max' ? 'bg-red-100 text-red-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {session.type}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{session.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.duration} min
                </span>
                <span>{session.day}</span>
                {session.indoor !== undefined && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {session.indoor ? '🏠 Indoor' : '🌄 Outdoor'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="border-t border-gray-200 bg-gray-50">
          <div className="space-y-6 py-4">
            {/* Main Set */}
            <div>
              <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Main Set
              </h5>
              <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                {breakdown.mainSet}
              </p>
            </div>

            {/* Zone Breakdown */}
            <div>
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                Time in Zones
              </h5>
              <div className="space-y-2">
                {breakdown.zones.map((zone, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${zone.color}`} />
                        <span className="font-medium text-sm text-gray-900">{zone.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(zone.time)} min
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Power: {zone.power}</span>
                        {ftp && getPowerTargets(zone) && (
                          <span className="font-semibold text-blue-600">
                            ({getPowerTargets(zone)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>HR: {zone.hr}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zwift Recommendation */}
            <div>
              <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-orange-600 font-bold">Z</span>
                Zwift® Workout Recommendation
              </h5>
              <div className="bg-orange-50 p-4 rounded border border-orange-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-orange-900">{zwiftWorkout.name}</div>
                    <p className="text-sm text-gray-700 mt-1">{zwiftWorkout.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {zwiftWorkout.duration} min
                      </span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                        {session.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-xs text-gray-600 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>
                      Search for this workout in Zwift's workout library or use a similar workout 
                      that matches the duration and intensity profile.
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Disclaimer:</strong> Zwift<sup>®</sup> is a registered trademark of Zwift, Inc. 
                    RiderLabs is not affiliated with, endorsed by, or sponsored by Zwift, Inc.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Points */}
            {session.targets && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Key Points</h5>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside bg-white p-3 rounded border border-gray-200">
                  <li>{session.targets}</li>
                  <li>Stay hydrated throughout the session</li>
                  <li>Focus on smooth, consistent effort</li>
                  <li>Listen to your body and adjust if needed</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SessionDetail;
