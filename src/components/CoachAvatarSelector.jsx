import React, { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { COACH_PERSONAS, getUserCoach, setUserCoach } from '../lib/coachPersonas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';

const CoachAvatarSelector = ({ onCoachChange }) => {
  const [selectedCoach, setSelectedCoach] = useState(getUserCoach());

  const handleSelectCoach = (coachId) => {
    setSelectedCoach(coachId);
    setUserCoach(coachId);
    if (onCoachChange) {
      onCoachChange(coachId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">👤</span>
          Choose Your Coach
        </CardTitle>
        <CardDescription>
          Select a coaching style that resonates with you. Your coach's personality will influence training notes and feedback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COACH_PERSONAS.map((coach) => (
            <div
              key={coach.id}
              onClick={() => handleSelectCoach(coach.id)}
              className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                selectedCoach === coach.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Selection Indicator */}
              {selectedCoach === coach.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Coach Avatar */}
              <div className="text-center mb-3">
                <div className="text-6xl mb-2">{coach.avatar}</div>
                <h3 className="font-bold text-lg text-gray-900">{coach.name}</h3>
                <p className="text-sm text-gray-600 font-medium">{coach.style}</p>
              </div>

              {/* Coach Description */}
              <p className="text-sm text-gray-700 mb-3">{coach.description}</p>

              {/* Catchphrase */}
              <div className={`p-2 rounded-lg bg-gradient-to-r ${coach.color} text-white text-center`}>
                <p className="text-xs font-semibold italic">"{coach.catchphrase}"</p>
              </div>

              {/* Personality Hint */}
              <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <p>{coach.personality}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Current Selection Summary */}
        {selectedCoach && (
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-4xl">
                {COACH_PERSONAS.find(c => c.id === selectedCoach)?.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  You've selected {COACH_PERSONAS.find(c => c.id === selectedCoach)?.name}
                </p>
                <p className="text-xs text-blue-700">
                  Your training notes will reflect a {COACH_PERSONAS.find(c => c.id === selectedCoach)?.style.toLowerCase()} coaching style
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoachAvatarSelector;
