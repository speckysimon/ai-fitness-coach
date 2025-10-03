import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import UserProfile from './pages/UserProfile';
import PlanGenerator from './pages/PlanGenerator';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import FTPHistory from './pages/FTPHistory';
import AllActivities from './pages/AllActivities';
import RaceAnalytics from './pages/RaceAnalytics';
import RiderProfile from './pages/RiderProfile';
import RaceDayPredictor from './pages/RaceDayPredictor';
import Methodology from './pages/Methodology';
import Form from './pages/Form';
import ChangelogPage from './pages/ChangelogPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [stravaTokens, setStravaTokens] = useState(null);
  const [googleTokens, setGoogleTokens] = useState(null);

  useEffect(() => {
    // Check for session token and fetch user data from backend
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      fetchUserData(sessionToken);
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
    <Router>
      <Routes>
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
                  <Route
                    path="/ftp"
                    element={
                      <FTPHistory
                        stravaTokens={stravaTokens}
                      />
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
                  <Route
                    path="/rider-profile"
                    element={
                      <RiderProfile
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
                    path="/plan"
                    element={
                      <PlanGenerator
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                        userProfile={userProfile}
                      />
                    }
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
                  <Route
                    path="/form"
                    element={
                      <Form
                        stravaTokens={stravaTokens}
                      />
                    }
                  />
                  <Route
                    path="/changelog"
                    element={<ChangelogPage />}
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
  );
}

export default App;
