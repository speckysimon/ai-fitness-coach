import React, { useState, useEffect } from 'react';
import { Check, Info } from 'lucide-react';
import { fetchCoachPersonas, getUserCoach, setUserCoach } from '../lib/coachPersonas';

const CoachAvatarSelector = ({ onCoachChange }) => {
  const [selectedCoach, setSelectedCoach] = useState(getUserCoach());
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const data = await fetchCoachPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCoach = (coachId) => {
    setSelectedCoach(coachId);
    setUserCoach(coachId);
    if (onCoachChange) {
      onCoachChange(coachId);
    }
  };

  return (
    <>
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading coaches...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((coach) => (
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
                {coach.avatar_url ? (
                  <img
                    src={coach.avatar_url}
                    alt={coach.name}
                    className="mx-auto mb-2 rounded-full object-cover border-2 border-gray-300"
                    style={{ width: '300px', height: '300px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <div className="text-6xl mb-2" style={{ display: coach.avatar_url ? 'none' : 'block' }}>
                  {coach.avatar || '👤'}
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{coach.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{coach.style}</p>
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
      )}

      {/* Current Selection Summary */}
      {selectedCoach && personas.length > 0 && (() => {
        const selected = personas.find(c => c.id === selectedCoach);
        if (!selected) return null;
        return (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-4xl">
                {selected.avatar_url ? (
                  <img
                    src={selected.avatar_url}
                    alt={selected.name}
                    className="rounded-full object-cover border-2 border-blue-300"
                    style={{ width: '48px', height: '48px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'inline';
                    }}
                  />
                ) : null}
                <span style={{ display: selected.avatar_url ? 'none' : 'inline' }}>
                  {selected.avatar || '👤'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  You've selected {selected.name}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your training notes will reflect a {selected.style.toLowerCase()} coaching style
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default CoachAvatarSelector;
