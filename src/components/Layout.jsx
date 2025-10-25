import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Calendar, Target, Settings, LogOut, Zap, List, BookOpen, TrendingUp, Package, Trophy, User, Crosshair, UserCircle, Dumbbell, Award } from 'lucide-react';
import StravaAttribution from './StravaAttribution';
import GarminAttribution from './GarminAttribution';
import ZwiftAttribution from './ZwiftAttribution';
import ThemeSwitcher from './ThemeSwitcher';
import FeedbackWidget from './FeedbackWidget';

const Layout = ({ children, onLogout, userProfile }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Activity },
    { name: "Today's Workout", href: '/workout/today', icon: Dumbbell },
    { name: 'Rider Profile', href: '/rider-profile', icon: User },
    { name: 'Race Day Predictor', href: '/race-day-predictor', icon: Crosshair },
    { name: 'Race Analysis', href: '/race-analysis', icon: Award },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'AI Coach', href: '/plan', icon: Target },
    { name: 'Form & Fitness', href: '/form', icon: TrendingUp },
    { name: 'FTP History', href: '/ftp', icon: Zap },
    { name: 'All Activities', href: '/activities', icon: List },
    { name: 'Race Analytics', href: '/race-analytics', icon: Trophy },
    { name: 'Methodology', href: '/methodology', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔬</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">RiderLabs</h1>
                <p className="text-xs text-muted-foreground">Performance Engineered</p>
              </div>
            </div>
            {/* User Info */}
            {userProfile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-primary" />
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

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
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

          {/* Theme Switcher */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <ThemeSwitcher className="w-full" />
          </div>

          {/* Version & Changelog */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <Link
              to="/changelog"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>v0.2.0</span>
            </Link>
          </div>

          {/* API Attributions */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <div className="space-y-2">
              <StravaAttribution className="px-4" />
              <GarminAttribution className="px-4" />
              <ZwiftAttribution className="px-4" />
            </div>
            <div className="px-4 mt-3 flex gap-3 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
            </div>
            <div className="px-4 mt-3 text-[10px] text-muted-foreground leading-relaxed">
              Zwift®, Strava®, and Google Calendar™ are trademarks of their respective owners. 
              Not affiliated.
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
      <div className="pl-64">
        <main className="min-h-screen p-8">
          {children}
        </main>
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
};

export default Layout;
