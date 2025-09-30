import React from 'react';
import { Activity, Calendar, LogOut, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const Settings = ({ stravaTokens, googleTokens, onLogout }) => {
  const clearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      alert('All local data has been cleared.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your connections and preferences</p>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your third-party integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strava */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Strava</h3>
                <p className="text-sm text-gray-600">Activity tracking and history</p>
              </div>
            </div>
            {stravaTokens ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <Button variant="outline" size="sm">Connect</Button>
            )}
          </div>

          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Google Calendar</h3>
                <p className="text-sm text-gray-600">Training plan synchronization</p>
              </div>
            </div>
            {googleTokens ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <Button variant="outline" size="sm">Connect</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Required API keys and credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Setup Required</h4>
            <p className="text-sm text-yellow-700 mb-4">
              To use this application, you need to configure the following API credentials in your <code className="bg-yellow-100 px-1 rounded">.env</code> file:
            </p>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li>• <strong>Strava API:</strong> Get your credentials from <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="underline">Strava API Settings</a></li>
              <li>• <strong>OpenAI API:</strong> Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
              <li>• <strong>Google Calendar API:</strong> Set up OAuth credentials in <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your local application data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Clear Local Data</h3>
              <p className="text-sm text-gray-600">Remove all stored tokens and cached data</p>
            </div>
            <Button variant="outline" onClick={clearData}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>AI Fitness Coach</strong> v1.0.0</p>
            <p>A lightweight AI-assisted training coach that integrates with Strava and Google Calendar.</p>
            <p className="pt-4 border-t border-gray-200">
              Built with React, Express, OpenAI, and modern web technologies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
