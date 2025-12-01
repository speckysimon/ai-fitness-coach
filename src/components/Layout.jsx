import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Calendar, Target, Settings, LogOut, Zap, List, BookOpen, TrendingUp, Trophy, User, Crosshair, UserCircle, Dumbbell, Award, ChevronDown, Sparkles, Brain, BarChart3, Menu, X } from 'lucide-react';
import StravaAttribution from './StravaAttribution';
import GarminAttribution from './GarminAttribution';
import ZwiftAttribution from './ZwiftAttribution';
import ThemeSwitcher from './ThemeSwitcher';
import ThemeSelector from './ThemeSelector';
import FeedbackWidget from './FeedbackWidget';
import CoachChatWidget from './CoachChatWidget';

const Layout = ({ children, onLogout, userProfile }) => {
  const location = useLocation();
  const [raceIntelligenceExpanded, setRaceIntelligenceExpanded] = useState(false);
  const [riderIntelligenceExpanded, setRiderIntelligenceExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper to get full avatar URL
  const getAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:5001${url}`;
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Activity },
    { name: "Today's Workout", href: '/workout/today', icon: Dumbbell },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'All Activities', href: '/activities', icon: List },
    { name: 'Methodology', href: '/methodology', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const riderIntelligence = [
    { name: 'Rider Profile', href: '/rider-intelligence/profile', icon: User },
    { name: 'Training Plan', href: '/rider-intelligence/plan', icon: Target },
    { name: 'Weekly Report', href: '/rider-intelligence/weekly-report', icon: BarChart3 },
    { name: 'Performance Metrics', href: '/rider-intelligence/metrics', icon: Zap },
    { name: 'Form & Fitness', href: '/rider-intelligence/form', icon: TrendingUp },
  ];

  const raceIntelligence = [
    { name: 'Season Planner', href: '/season-planner', icon: Calendar },
    { name: 'Race Day Predictor', href: '/race-day-predictor', icon: Crosshair },
    { name: 'Race Analysis', href: '/race-analysis', icon: Award },
    { name: 'Race Analytics', href: '/race-analytics', icon: Trophy },
  ];

  // Check if any race page is active
  const isRacePageActive = raceIntelligence.some(item => location.pathname === item.href);

  // Check if any rider intelligence page is active
  const isRiderPageActive = riderIntelligence.some(item => location.pathname === item.href);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="RiderLabs" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold text-foreground">RiderLabs</h1>
            <p className="text-xs text-muted-foreground">Performance Engineered</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border overflow-hidden z-50 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-border flex-shrink-0">
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <img src="/favicon.svg" alt="RiderLabs" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-foreground">RiderLabs</h1>
                <p className="text-xs text-muted-foreground">Performance Engineered</p>
              </div>
            </div>
            {/* User Info */}
            {userProfile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {userProfile.avatar_url ? (
                    <img
                      src={getAvatarUrl(userProfile.avatar_url)}
                      alt={userProfile.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userProfile.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile.email}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Theme Controls - Moved to top for better accessibility */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0 space-y-2">
            <ThemeSelector className="w-full" />
            <ThemeSwitcher className="w-full" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Main navigation items (excluding Methodology and Settings) */}
            {navigation.filter(item => item.name !== 'Methodology' && item.name !== 'Settings').map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Rider Intelligence Section */}
            <div className="pt-2">
              <button
                onClick={() => setRiderIntelligenceExpanded(!riderIntelligenceExpanded)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${isRiderPageActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5" />
                  <span>Rider Intelligence</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${riderIntelligenceExpanded ? 'transform rotate-180' : ''
                    }`}
                />
              </button>
              {riderIntelligenceExpanded && (
                <div className="mt-1 ml-4 space-y-1">
                  {riderIntelligence.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Race Intelligence Section */}
            <div className="pt-2">
              <button
                onClick={() => setRaceIntelligenceExpanded(!raceIntelligenceExpanded)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${isRacePageActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <span>Race Intelligence</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${raceIntelligenceExpanded ? 'transform rotate-180' : ''
                    }`}
                />
              </button>
              {raceIntelligenceExpanded && (
                <div className="mt-1 ml-4 space-y-1">
                  {raceIntelligence.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Methodology and Settings at the bottom */}
            {navigation.filter(item => item.name === 'Methodology' || item.name === 'Settings').map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* API Attributions */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <div className="flex items-center justify-center gap-4 px-4 py-2">
              <StravaAttribution />
              <GarminAttribution />
              <ZwiftAttribution />
            </div>
            <div className="px-4 mt-3 flex gap-3 text-xs text-muted-foreground justify-center">
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
            </div>
          </div>

          {/* Logout */}
          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget />

      {/* Coach Chat Widget */}
      <CoachChatWidget />
    </div>
  );
};

export default Layout;
