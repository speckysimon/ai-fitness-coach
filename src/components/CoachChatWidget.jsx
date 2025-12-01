import React, { useState, useEffect } from 'react';
import { X, Brain, Send, Loader } from 'lucide-react';
import { getCoachPersona, getUserCoach, fetchCoachPersonas } from '../lib/coachPersonas';

const CoachChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recentActivities, setRecentActivities] = useState([]);
    const [currentFtp, setCurrentFtp] = useState(null);
    const [coach, setCoach] = useState(null);

    useEffect(() => {
        loadCoachData();
    }, []);



    const loadCoachData = async () => {
        // Load coach persona from API
        try {
            const coachId = getUserCoach();
            const personas = await fetchCoachPersonas();
            const selectedCoach = personas.find(p => p.id === coachId) || personas[0];
            setCoach(selectedCoach);
        } catch (error) {
            console.error('Error loading coach:', error);
            // Fallback to default
            const coachId = getUserCoach();
            const fallbackCoach = getCoachPersona(coachId);
            setCoach(fallbackCoach);
        }

        // Load recent activities from cache
        try {
            const cached = localStorage.getItem('cached_activities');
            if (cached) {
                const activities = JSON.parse(cached);
                const recent = activities.slice(0, 10).map(a => ({
                    date: a.start_date_local?.split('T')[0] || a.date,
                    name: a.name,
                    type: a.type || a.sport_type,
                    distance: Math.round((a.distance || 0) / 1000),
                    duration: Math.round((a.moving_time || a.duration || 0) / 60),
                    avgPower: Math.round(a.average_watts || a.avgPower || 0),
                    normalizedPower: Math.round(a.weighted_average_watts || a.normalizedPower || 0),
                    avgHeartRate: Math.round(a.average_heartrate || a.avgHeartRate || 0),
                    elevation: Math.round(a.total_elevation_gain || a.elevation || 0),
                    tss: a.suffer_score || a.tss || 0
                }));
                setRecentActivities(recent);
            }

            // Load FTP
            const ftpData = localStorage.getItem('user_ftp');
            if (ftpData) {
                setCurrentFtp(parseInt(ftpData));
            }
        } catch (error) {
            console.error('Error loading coach data:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!message.trim()) return;

        // Add user message to chat
        const userMessage = { role: 'user', content: message };
        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setIsLoading(true);

        try {
            const sessionToken = localStorage.getItem('session_token');
            const selectedCoach = localStorage.getItem('selected_coach') || 'motivator';

            const response = await fetch('/api/coach/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                    message: message,
                    coachId: selectedCoach,
                    context: {
                        recentActivities: recentActivities,
                        currentFtp: currentFtp
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const coachMessage = { role: 'coach', content: data.response };
                setChatHistory(prev => [...prev, coachMessage]);
            } else {
                const errorData = await response.json();
                console.error('Coach chat error:', errorData);
                const errorMessage = {
                    role: 'error',
                    content: 'Sorry, I encountered an error. Please try again.'
                };
                setChatHistory(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Error asking coach:', error);
            const errorMessage = {
                role: 'error',
                content: 'Network error. Please check your connection.'
            };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!coach) return null;

    return (
        <>
            {/* Floating Coach Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-40 w-16 h-16 rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-1"
                aria-label="Ask Your Coach"
            >
                <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                    {coach.avatar_url ? (
                        <img
                            src={coach.avatar_url}
                            alt={coach.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-100">
                            {coach.avatar || '🏃'}
                        </div>
                    )}
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
            </button>

            {/* Coach Chat Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                                        {coach.avatar_url ? (
                                            <img
                                                src={coach.avatar_url}
                                                alt={coach.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100">
                                                {coach.avatar || '🏃'}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{coach.name}</h2>
                                        <p className="text-sm text-white/80">{coach.style} Coach</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                                    aria-label="Close chat"
                                >
                                    <X className="w-7 h-7" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {chatHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                        Ask {coach.name} Anything!
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                                        Get personalized coaching advice based on your recent activities, FTP, and training goals.
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 max-w-md mx-auto text-left">
                                        <button
                                            onClick={() => setMessage("Based on my recent rides, how is my training progressing?")}
                                            className="p-3 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 transition-colors text-left"
                                        >
                                            💪 How is my training progressing?
                                        </button>
                                        <button
                                            onClick={() => setMessage("What should I focus on in my next training block?")}
                                            className="p-3 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 transition-colors text-left"
                                        >
                                            🎯 What should I focus on next?
                                        </button>
                                        <button
                                            onClick={() => setMessage("Can you estimate my current FTP from my recent rides?")}
                                            className="p-3 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 transition-colors text-left"
                                        >
                                            ⚡ Estimate my current FTP
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {chatHistory.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : msg.role === 'error'
                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                    }`}
                                            >
                                                {msg.role === 'coach' && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {coach.avatar_url ? (
                                                            <img src={coach.avatar_url} alt={coach.name} className="w-6 h-6 rounded-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg">{coach.avatar || '🏃'}</span>
                                                        )}
                                                        <span className="font-semibold text-sm">{coach.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800">
                                        <div className="flex items-center gap-2">
                                            {coach.avatar_url ? (
                                                <img src={coach.avatar_url} alt={coach.name} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <span className="text-lg">{coach.avatar || '🏃'}</span>
                                            )}
                                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                {coach.name} is thinking
                                            </span>
                                            <span className="inline-flex ml-1">
                                                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                                                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                                                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-3">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={`Ask ${coach.name} anything about your training...`}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                    rows={3}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!message.trim() || isLoading}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                💡 {coach.catchphrase}
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default CoachChatWidget;
