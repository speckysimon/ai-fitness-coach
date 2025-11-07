import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { trackPageView } from './lib/analytics';
import { initializeTheme } from './lib/themeService';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import UserProfile from './pages/UserProfile';
import PlanGenerator from './pages/PlanGenerator';
import TodaysWorkout from './pages/TodaysWorkout';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import PerformanceMetrics from './pages/PerformanceMetrics';
import AllActivities from './pages/AllActivities';
import RaceAnalytics from './pages/RaceAnalytics';
import RiderProfile from './pages/RiderProfile';
import WeeklyReport from './pages/WeeklyReport';
import RaceDayPredictor from './pages/RaceDayPredictor';
import PostRaceAnalysis from './pages/PostRaceAnalysis';
import SeasonPlanner from './pages/SeasonPlanner';
import Methodology from './pages/Methodology';
import Form from './pages/Form';
import ChangelogPage from './pages/ChangelogPage';
import KnownIssuesPage from './pages/KnownIssuesPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Layout from './components/Layout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import UserManagement from './pages/admin/UserManagement';
import AIConfigPage from './pages/admin/AIConfigPage';
import AIPromptsPage from './pages/admin/AIPromptsPage';
import CoachPersonasPage from './pages/admin/CoachPersonasPage';
import PlanTemplatesPage from './pages/admin/PlanTemplatesPage';
import ThemeConfigPage from './pages/admin/ThemeConfigPage';
import APIKeysPage from './pages/admin/APIKeysPage';
import ServicesPage from './pages/admin/ServicesPage';
import ActivityLogPage from './pages/admin/ActivityLogPage';
import GlobalSettings from './pages/admin/GlobalSettings';
import AdminChangelog from './pages/admin/AdminChangelog';

// Page view tracker component
function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [stravaTokens, setStravaTokens] = useState(null);
  const [googleTokens, setGoogleTokens] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    // Initialize theme system
    initializeTheme().then(theme => {
      console.log('🎨 Theme initialized:', theme?.name || 'Default');
    }).catch(error => {
      console.error('Failed to initialize theme:', error);
    });

    // Check for session token and fetch user data from backend
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      fetchUserData(sessionToken);
    }

    // Check for admin authentication
    const adminToken = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_user');
    if (adminToken && adminData) {
      setAdminUser(JSON.parse(adminData));
      setIsAdminAuthenticated(true);
    }
  }, []);

  const fetchUserData = async (sessionToken) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        // Session invalid, clear everything
        localStorage.removeItem('session_token');
        localStorage.removeItem('current_user');
        localStorage.removeItem('strava_tokens');
        localStorage.removeItem('google_tokens');
        return;
      }

      const data = await response.json();
      if (data.success && data.user) {
        const userProfile = {
          email: data.user.email,
          name: data.user.name,
          age: data.user.profile?.age,
          height: data.user.profile?.height,
          weight: data.user.profile?.weight,
          gender: data.user.profile?.gender,
          avatar_url: data.user.avatar_url,
          createdAt: data.user.createdAt,
        };
        
        setUserProfile(userProfile);
        setIsAuthenticated(true);
        localStorage.setItem('current_user', JSON.stringify(userProfile));

        // Set tokens from backend (or null if not present)
        if (data.user.stravaTokens) {
          console.log('App - Setting Strava tokens:', data.user.stravaTokens);
          setStravaTokens(data.user.stravaTokens);
          localStorage.setItem('strava_tokens', JSON.stringify(data.user.stravaTokens));
        } else {
          console.log('App - No Strava tokens, setting to null');
          setStravaTokens(null);
          localStorage.removeItem('strava_tokens');
        }
        
        if (data.user.googleTokens) {
          setGoogleTokens(data.user.googleTokens);
          localStorage.setItem('google_tokens', JSON.stringify(data.user.googleTokens));
        } else {
          setGoogleTokens(null);
          localStorage.removeItem('google_tokens');
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  const handleStravaAuth = async (tokens) => {
    setStravaTokens(tokens);
    
    if (tokens) {
      localStorage.setItem('strava_tokens', JSON.stringify(tokens));
      
      // Save tokens to backend
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        try {
          await fetch('/api/auth/strava-tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ tokens }),
          });
          console.log('✅ Strava tokens saved to backend');
        } catch (err) {
          console.error('Failed to save Strava tokens to backend:', err);
        }
      }
    } else {
      // Tokens are null, remove from localStorage
      localStorage.removeItem('strava_tokens');
    }
  };

  const handleGoogleAuth = async (tokens) => {
    setGoogleTokens(tokens);
    
    if (tokens) {
      localStorage.setItem('google_tokens', JSON.stringify(tokens));
      
      // Save tokens to backend
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        try {
          await fetch('/api/auth/google-tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ tokens }),
          });
          console.log('✅ Google tokens saved to backend');
        } catch (err) {
          console.error('Failed to save Google tokens to backend:', err);
        }
      }
    } else {
      // Tokens are null, remove from localStorage
      localStorage.removeItem('google_tokens');
    }
  };

  const handleLogin = (profile, tokens = {}) => {
    setUserProfile(profile);
    setIsAuthenticated(true);
    
    // Set tokens if provided
    if (tokens.stravaTokens) {
      setStravaTokens(tokens.stravaTokens);
      localStorage.setItem('strava_tokens', JSON.stringify(tokens.stravaTokens));
    }
    
    if (tokens.googleTokens) {
      setGoogleTokens(tokens.googleTokens);
      localStorage.setItem('google_tokens', JSON.stringify(tokens.googleTokens));
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile);
  };

  const handleLogout = async () => {
    const sessionToken = localStorage.getItem('session_token');
    
    // Logout on backend
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken }),
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('strava_tokens');
    localStorage.removeItem('google_tokens');
    localStorage.removeItem('current_user');
    localStorage.removeItem('session_token');
    
    // Clear state
    setStravaTokens(null);
    setGoogleTokens(null);
    setUserProfile(null);
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider>
      <Router>
        <PageViewTracker />
        <Routes>
        {/* Admin Routes */}
        <Route
          path="/admin/login"
          element={
            <AdminLogin
              onLogin={(admin, token) => {
                setAdminUser(admin);
                setIsAdminAuthenticated(true);
              }}
            />
          }
        />

        <Route
          path="/admin"
          element={
            isAdminAuthenticated ? (
              <AdminLayout
                admin={adminUser}
                onLogout={() => {
                  setAdminUser(null);
                  setIsAdminAuthenticated(false);
                }}
              />
            ) : (
              <Navigate to="/admin/login" />
            )
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="admins" element={<AdminUsers />} />
          <Route path="ai-config" element={<AIConfigPage />} />
          <Route path="ai-prompts" element={<AIPromptsPage />} />
          <Route path="plan-templates" element={<PlanTemplatesPage />} />
          <Route path="coach-personas" element={<CoachPersonasPage />} />
          <Route path="theme-config" element={<ThemeConfigPage />} />
          <Route path="api-keys" element={<APIKeysPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="settings" element={<GlobalSettings />} />
          <Route path="changelog" element={<AdminChangelog />} />
        </Route>

        {/* Landing Page */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Landing />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Login Route */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Profile Setup Route */}
        <Route
          path="/profile-setup"
          element={
            isAuthenticated ? (
              <ProfileSetup 
                userProfile={userProfile}
                onProfileUpdate={handleProfileUpdate}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />


        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout} userProfile={userProfile}>
                <Routes>
                  <Route
                    path="/dashboard"
                    element={
                      <Dashboard
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                        userProfile={userProfile}
                        onLogout={handleLogout}
                      />
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <UserProfile
                        userProfile={userProfile}
                        onProfileUpdate={handleProfileUpdate}
                      />
                    }
                  />
                  {/* Legacy FTP route - redirect to new location */}
                  <Route
                    path="/ftp"
                    element={
                      <Navigate to="/rider-intelligence/metrics" replace />
                    }
                  />
                  <Route
                    path="/activities"
                    element={
                      <AllActivities
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/race-analytics"
                    element={
                      <RaceAnalytics
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  {/* Rider Intelligence Routes */}
                  <Route
                    path="/rider-intelligence/profile"
                    element={
                      <RiderProfile
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  {/* Legacy route redirect */}
                  <Route
                    path="/rider-profile"
                    element={
                      <Navigate to="/rider-intelligence/profile" replace />
                    }
                  />
                  <Route
                    path="/rider-intelligence/weekly-report"
                    element={
                      <WeeklyReport
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/rider-intelligence/metrics"
                    element={
                      <PerformanceMetrics
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/rider-intelligence/form"
                    element={
                      <Form
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/race-day-predictor"
                    element={
                      <RaceDayPredictor
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/race-analysis"
                    element={
                      <PostRaceAnalysis
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/season-planner"
                    element={<SeasonPlanner />}
                  />
                  <Route
                    path="/rider-intelligence/plan"
                    element={
                      <PlanGenerator
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                        userProfile={userProfile}
                      />
                    }
                  />
                  {/* Legacy route redirect */}
                  <Route
                    path="/plan"
                    element={
                      <Navigate to="/rider-intelligence/plan" replace />
                    }
                  />
                  <Route
                    path="/workout/today"
                    element={<TodaysWorkout />}
                  />
                  <Route
                    path="/calendar"
                    element={
                      <Calendar
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                      />
                    }
                  />
                  <Route
                    path="/methodology"
                    element={<Methodology />}
                  />
                  {/* Legacy Form route - redirect to new location */}
                  <Route
                    path="/form"
                    element={
                      <Navigate to="/rider-intelligence/form" replace />
                    }
                  />
                  <Route
                    path="/changelog"
                    element={<ChangelogPage />}
                  />
                  <Route
                    path="/known-issues"
                    element={<KnownIssuesPage />}
                  />
                  <Route
                    path="/privacy"
                    element={<PrivacyPolicy />}
                  />
                  <Route
                    path="/terms"
                    element={<TermsOfService />}
                  />
                  <Route
                    path="/settings"
                    element={
                      <Settings
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                        onLogout={handleLogout}
                        onStravaAuth={handleStravaAuth}
                        onGoogleAuth={handleGoogleAuth}
                      />
                    }
                  />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
