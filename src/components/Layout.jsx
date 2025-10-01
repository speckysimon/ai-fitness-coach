import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Calendar, Target, Settings, LogOut, Zap, List, BookOpen, TrendingUp, Package, Trophy, User, Crosshair } from 'lucide-react';

const Layout = ({ children, onLogout }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Activity },
    { name: 'Rider Profile', href: '/rider-profile', icon: User },
    { name: 'Race Day Predictor', href: '/race-day-predictor', icon: Crosshair },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Plan Generator', href: '/plan', icon: Target },
    { name: 'Form & Fitness', href: '/form', icon: TrendingUp },
    { name: 'FTP History', href: '/ftp', icon: Zap },
    { name: 'All Activities', href: '/activities', icon: List },
    { name: 'Race Analytics', href: '/race-analytics', icon: Trophy },
    { name: 'Methodology', href: '/methodology', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Fitness Coach</h1>
              <p className="text-xs text-gray-500">Train Smarter</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Version & Changelog */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Link
              to="/changelog"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>v1.3.0</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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
    </div>
  );
};

export default Layout;
