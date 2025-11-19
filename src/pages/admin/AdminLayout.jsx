import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Brain,
  Settings,
  Key,
  Activity,
  LogOut,
  Menu,
  X,
  Shield,
  UserCog,
  FileText,
  Cloud,
  UserCircle,
  Calendar,
  Palette,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';

const AdminLayout = ({ admin, onLogout }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    if (onLogout) onLogout();
    navigate('/admin/login');
  };

  const allNavItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/admins', icon: UserCog, label: 'Admin Users' },
    { path: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/admin/ideas', icon: Lightbulb, label: 'Ideas & Improvements' },
    { path: '/admin/ai-config', icon: Brain, label: 'AI Configuration' },
    { path: '/admin/ai-prompts', icon: FileText, label: 'AI Prompts' },
    { path: '/admin/plan-templates', icon: Calendar, label: 'Plan Templates' },
    { path: '/admin/coach-personas', icon: UserCircle, label: 'Coach Personas' },
    { path: '/admin/theme-config', icon: Palette, label: 'Theme Configuration' },
    { path: '/admin/api-keys', icon: Key, label: 'API Keys', superAdminOnly: true },
    { path: '/admin/services', icon: Cloud, label: 'Services' },
    { path: '/admin/settings', icon: Settings, label: 'Global Settings' },
    { path: '/admin/activity', icon: Activity, label: 'Activity Log' },
    { path: '/admin/changelog', icon: FileText, label: 'Changelog' },
  ];

  // Filter nav items based on admin role
  const navItems = allNavItems.filter(item => {
    if (item.superAdminOnly) {
      return admin?.isSuperAdmin === true;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <h1 className="text-xl font-bold">RiderLabs Admin</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{admin?.name || 'Admin'}</p>
              <p className="text-xs text-blue-100">{admin?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col`}
        >
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 bg-white mt-auto">
            <div className="text-xs text-gray-500 text-center">
              <p className="font-semibold">Admin Panel v1.0</p>
              <p>RiderLabs © 2025</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
