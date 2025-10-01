import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import PlanGenerator from './pages/PlanGenerator';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import FTPHistory from './pages/FTPHistory';
import AllActivities from './pages/AllActivities';
import RaceAnalytics from './pages/RaceAnalytics';
import RiderProfile from './pages/RiderProfile';
import Methodology from './pages/Methodology';
import Form from './pages/Form';
import ChangelogPage from './pages/ChangelogPage';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stravaTokens, setStravaTokens] = useState(null);
  const [googleTokens, setGoogleTokens] = useState(null);

  useEffect(() => {
    // Check for stored tokens
    const storedStravaTokens = localStorage.getItem('strava_tokens');
    const storedGoogleTokens = localStorage.getItem('google_tokens');

    if (storedStravaTokens) {
      setStravaTokens(JSON.parse(storedStravaTokens));
      setIsAuthenticated(true);
    }

    if (storedGoogleTokens) {
      setGoogleTokens(JSON.parse(storedGoogleTokens));
    }
  }, []);

  const handleStravaAuth = (tokens) => {
    setStravaTokens(tokens);
    localStorage.setItem('strava_tokens', JSON.stringify(tokens));
    setIsAuthenticated(true);
  };

  const handleGoogleAuth = (tokens) => {
    setGoogleTokens(tokens);
    localStorage.setItem('google_tokens', JSON.stringify(tokens));
  };

  const handleLogout = () => {
    localStorage.removeItem('strava_tokens');
    localStorage.removeItem('google_tokens');
    setStravaTokens(null);
    setGoogleTokens(null);
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/setup"
          element={
            <Setup
              onStravaAuth={handleStravaAuth}
              onGoogleAuth={handleGoogleAuth}
              stravaTokens={stravaTokens}
              googleTokens={googleTokens}
            />
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Dashboard
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                        onLogout={handleLogout}
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
                    path="/plan"
                    element={
                      <PlanGenerator
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
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
                    path="/settings"
                    element={
                      <Settings
                        stravaTokens={stravaTokens}
                        googleTokens={googleTokens}
                        onLogout={handleLogout}
                      />
                    }
                  />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/setup" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
