import React from 'react';
import { Shield, Lock, Database, Eye, UserCheck, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Privacy Policy
        </h1>
        <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-700">
            AI Fitness Coach ("we", "our", or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, and safeguard your information 
            when you use our training application.
          </p>
        </CardContent>
      </Card>

      {/* Information We Collect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Account Information</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Email address (for authentication)</li>
              <li>Name (optional, for personalization)</li>
              <li>Profile information (age, weight, height, gender)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Strava Data</h3>
            <p className="text-gray-700 mb-2">When you connect your Strava account, we access:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Activity data (rides, runs, workouts)</li>
              <li>Performance metrics (power, heart rate, speed, distance)</li>
              <li>Activity dates and durations</li>
              <li>Elevation and route data</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Google Calendar Data</h3>
            <p className="text-gray-700 mb-2">When you connect Google Calendar, we:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Create training events in your calendar</li>
              <li>Read calendar events to avoid scheduling conflicts</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How We Use Your Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Generate personalized training plans based on your fitness level and goals</li>
            <li>Calculate training metrics (FTP, TSS, training load)</li>
            <li>Display your activity history and progress</li>
            <li>Sync training sessions to your Google Calendar</li>
            <li>Provide insights and recommendations for your training</li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Data Storage & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Local Storage</h3>
            <p className="text-gray-700">
              Most of your data is stored locally in your browser using localStorage. 
              This means your activity data and training plans remain on your device.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Server Storage</h3>
            <p className="text-gray-700">
              We store minimal data on our servers:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Authentication tokens (encrypted)</li>
              <li>User account information (email, profile data)</li>
              <li>OAuth tokens for Strava and Google (encrypted)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Security Measures</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>OAuth 2.0 for secure authentication</li>
              <li>HTTPS encryption for all data transmission</li>
              <li>No storage of sensitive activity streams or detailed GPS data</li>
              <li>Automatic token refresh to maintain security</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Third-Party Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            Third-Party Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Strava</h3>
            <p className="text-gray-700">
              We use Strava's API to access your activity data. Your use of Strava is subject to{' '}
              <a 
                href="https://www.strava.com/legal/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Strava's Privacy Policy
              </a>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Google Calendar</h3>
            <p className="text-gray-700">
              We use Google Calendar API to sync training sessions. Your use of Google services is subject to{' '}
              <a 
                href="https://policies.google.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google's Privacy Policy
              </a>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">OpenAI</h3>
            <p className="text-gray-700">
              We use OpenAI's API to generate training plans. Your training data is sent to OpenAI 
              for plan generation but is not stored by OpenAI. See{' '}
              <a 
                href="https://openai.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenAI's Privacy Policy
              </a>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Your Rights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li><strong>Access:</strong> View all data we have about you</li>
            <li><strong>Delete:</strong> Request deletion of your account and all associated data</li>
            <li><strong>Disconnect:</strong> Revoke access to Strava or Google Calendar at any time</li>
            <li><strong>Export:</strong> Download your training plans and data</li>
            <li><strong>Opt-out:</strong> Stop using our service at any time</li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sharing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 font-semibold mb-2">We do NOT:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Sell your data to third parties</li>
            <li>Share your activity data with other users</li>
            <li>Use your data for advertising</li>
            <li>Aggregate your data across users for analytics</li>
          </ul>
        </CardContent>
      </Card>

      {/* Changes to Privacy Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Changes to This Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by updating the "Last updated" date at the top of this policy. Continued use of the 
            service after changes constitutes acceptance of the updated policy.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            If you have questions about this Privacy Policy or your data, please contact us through 
            the Settings page or by disconnecting your accounts and deleting your local data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
