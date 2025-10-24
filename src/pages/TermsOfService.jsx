import React from 'react';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          Terms of Service
        </h1>
        <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-700">
            Welcome to RiderLabs. By using our service, you agree to these Terms of Service. 
            Please read them carefully before using the application.
          </p>
        </CardContent>
      </Card>

      {/* Acceptance of Terms */}
      <Card>
        <CardHeader>
          <CardTitle>1. Acceptance of Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            By accessing or using RiderLabs, you agree to be bound by these Terms of Service 
            and our Privacy Policy. If you do not agree to these terms, please do not use our service.
          </p>
        </CardContent>
      </Card>

      {/* Service Description */}
      <Card>
        <CardHeader>
          <CardTitle>2. Service Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">RiderLabs provides:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Integration with Strava to analyze your training activities</li>
            <li>AI-powered training plan generation</li>
            <li>Training metrics calculation (FTP, TSS, training load)</li>
            <li>Google Calendar synchronization for training sessions</li>
            <li>Progress tracking and analytics</li>
          </ul>
        </CardContent>
      </Card>

      {/* Third-Party Services */}
      <Card>
        <CardHeader>
          <CardTitle>3. Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Strava</h3>
            <p className="text-gray-700">
              Our service integrates with Strava. You must comply with{' '}
              <a 
                href="https://www.strava.com/legal/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Strava's Terms of Service
              </a>. 
              We are not affiliated with or endorsed by Strava.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Google Calendar</h3>
            <p className="text-gray-700">
              Calendar integration requires a Google account and compliance with{' '}
              <a 
                href="https://policies.google.com/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google's Terms of Service
              </a>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle>4. User Responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">You agree to:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Provide accurate profile information (age, weight, fitness level)</li>
            <li>Use the service only for personal, non-commercial purposes</li>
            <li>Not attempt to reverse engineer or exploit the service</li>
            <li>Not share your account credentials with others</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>
        </CardContent>
      </Card>

      {/* Medical Disclaimer */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            5. Medical Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-orange-900 font-semibold">
            IMPORTANT: RiderLabs is NOT a substitute for professional medical or coaching advice.
          </p>
          <ul className="list-disc list-inside text-orange-800 space-y-2 ml-4">
            <li>Always consult with a qualified healthcare provider before starting any exercise program</li>
            <li>Our AI-generated training plans are suggestions, not medical prescriptions</li>
            <li>We are not responsible for injuries or health issues resulting from following our recommendations</li>
            <li>Listen to your body and adjust training as needed</li>
            <li>If you experience pain, dizziness, or unusual symptoms, stop exercising and consult a doctor</li>
          </ul>
        </CardContent>
      </Card>

      {/* Limitation of Liability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            6. Limitation of Liability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">
            RiderLabs is provided "AS IS" without warranties of any kind. We are not liable for:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Injuries or health issues resulting from training</li>
            <li>Inaccurate FTP or performance calculations</li>
            <li>Data loss or service interruptions</li>
            <li>Third-party service failures (Strava, Google, OpenAI)</li>
            <li>Missed training sessions or calendar sync errors</li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Usage */}
      <Card>
        <CardHeader>
          <CardTitle>7. Data Usage & Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Your use of RiderLabs is subject to our{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>. 
            We collect and process data as described in that policy. You retain ownership of your data 
            and can delete it at any time.
          </p>
        </CardContent>
      </Card>

      {/* Intellectual Property */}
      <Card>
        <CardHeader>
          <CardTitle>8. Intellectual Property</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            RiderLabs and its original content, features, and functionality are owned by us 
            and are protected by international copyright, trademark, and other intellectual property laws. 
            Your training data and generated plans remain your property.
          </p>
        </CardContent>
      </Card>

      {/* Third-Party Trademarks */}
      <Card>
        <CardHeader>
          <CardTitle>9. Third-Party Trademarks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">
            RiderLabs references third-party products and services for informational purposes only:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>
              <strong>Zwift®</strong> is a registered trademark of Zwift, Inc. 
              RiderLabs is not affiliated with, endorsed by, or sponsored by Zwift, Inc.
            </li>
            <li>
              <strong>Strava®</strong> is a registered trademark of Strava, Inc. 
              RiderLabs is not affiliated with, endorsed by, or sponsored by Strava, Inc.
            </li>
            <li>
              <strong>Google Calendar™</strong> is a trademark of Google LLC. 
              RiderLabs is not affiliated with, endorsed by, or sponsored by Google LLC.
            </li>
          </ul>
          <p className="text-gray-700 mt-3">
            All workout recommendations, activity integrations, and third-party references are 
            provided for informational purposes only. Users should verify availability and 
            compatibility independently.
          </p>
        </CardContent>
      </Card>

      {/* Service Availability */}
      <Card>
        <CardHeader>
          <CardTitle>10. Service Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>We do not guarantee uninterrupted or error-free service</li>
            <li>We may modify, suspend, or discontinue the service at any time</li>
            <li>We may impose usage limits or restrictions</li>
            <li>Maintenance and updates may cause temporary downtime</li>
          </ul>
        </CardContent>
      </Card>

      {/* Account Termination */}
      <Card>
        <CardHeader>
          <CardTitle>11. Account Termination</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">
            You may terminate your account at any time by:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Disconnecting Strava and Google Calendar</li>
            <li>Clearing your local data in Settings</li>
            <li>Logging out and not returning</li>
          </ul>
          <p className="text-gray-700 mt-3">
            We reserve the right to terminate accounts that violate these terms.
          </p>
        </CardContent>
      </Card>

      {/* Changes to Terms */}
      <Card>
        <CardHeader>
          <CardTitle>12. Changes to Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            We may update these Terms of Service from time to time. Changes will be effective 
            immediately upon posting. Continued use of the service after changes constitutes 
            acceptance of the updated terms.
          </p>
        </CardContent>
      </Card>

      {/* Governing Law */}
      <Card>
        <CardHeader>
          <CardTitle>13. Governing Law</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            These Terms shall be governed by and construed in accordance with applicable laws, 
            without regard to conflict of law provisions.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            13. Contact & Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            If you have questions about these Terms of Service, please review our documentation 
            or disconnect your accounts if you do not agree to these terms.
          </p>
        </CardContent>
      </Card>

      {/* Acceptance */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-blue-900 font-medium">
            By using RiderLabs, you acknowledge that you have read, understood, and agree 
            to be bound by these Terms of Service and our Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsOfService;
