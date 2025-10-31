import React from 'react';
import { Package, CheckCircle, Bug, Sparkles, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const AdminChangelog = () => {
  const versions = [
    {
      version: '1.2.0',
      date: '2025-10-30',
      type: 'major',
      changes: {
        features: [
          '📝 AI Prompts Page - View all AI prompts used in the application',
          '🔑 OAuth Credentials Support - Full support for Strava and Google OAuth',
          '🤖 Gemini 2.0 & 2.5 Models - Added latest Gemini models to AI Config',
          '🔐 Centralized Credentials - All API keys and OAuth credentials in database',
          '💬 4 AI Prompts Displayed - Training Plan, Plan Adjustments, Workout Analysis, Plan Adaptation',
          '📋 Copy to Clipboard - One-click copy of any prompt',
          '🔍 Expandable Prompt Details - System prompt, user prompt, variables, expected output',
        ],
        improvements: [
          'API Keys modal now supports OAuth (Client ID, Secret, Redirect URI)',
          'Dynamic form fields based on provider type',
          'Smart validation for OAuth vs simple API keys',
          'Gemini model dropdown updated with 2.0 and 2.5 versions',
          'All credentials stored in single location (Admin Panel)',
          'No more scattered .env configuration',
          'Color-coded prompt sections for easy reading',
        ],
        technical: [
          'New page: AIPromptsPage.jsx with expand/collapse UI',
          'Database migration: add_oauth_fields_to_api_keys.sql',
          'Added client_id and redirect_uri columns to api_keys table',
          'New method: getOAuthConfig() in apiKeyLoader.cjs',
          'Updated aiConfigService.cjs to handle OAuth credentials',
          'GET /api/admin/ai-prompts endpoint',
          'Encryption for Client Secrets using AES-256-CBC',
          'Fallback to .env for backward compatibility',
        ],
      },
    },
    {
      version: '1.1.0',
      date: '2025-10-30',
      type: 'major',
      changes: {
        features: [
          '📊 Token Usage Tracking - Real-time monitoring of AI API calls',
          '💰 Monthly Cost Calculator - Automatic cost calculation based on usage and pricing',
          '🔄 Automated Pricing Updates - Monthly cron job updates model pricing',
          '📈 4 Metric Cards - Total tokens, 7-day, daily, and monthly cost',
          '🎯 Model Dropdown Selectors - Choose specific models for each feature',
          '💾 Token Usage Database - Logs every AI request with full details',
          '💵 AI Model Pricing Database - Stores pricing for 9 AI models',
          '🕐 Cron Job System - Runs monthly on 1st at 2:00 AM',
        ],
        improvements: [
          'AI Config page redesigned with 4 metric cards',
          'Model selection via dropdown (5 OpenAI + 4 Gemini models)',
          'Real-time cost breakdown by model',
          'Token usage statistics (total, weekly, daily)',
          'Automatic pricing updates from OpenAI and Gemini',
          'Per-model cost calculation with input/output pricing',
        ],
        technical: [
          '2 new database tables (token_usage_logs, ai_model_pricing)',
          'Migration: 008_add_token_tracking.cjs',
          'tokenTrackingService.cjs - Token logging and stats',
          'modelPricingCron.cjs - Monthly pricing updates',
          '3 new API endpoints (/token-usage, /available-models, /update-model-pricing)',
          'node-cron integration for automated updates',
          'Indexes on created_at and model for fast queries',
        ],
      },
    },
    {
      version: '1.0.0',
      date: '2025-10-30',
      type: 'major',
      changes: {
        features: [
          '🔐 Complete Admin Panel System launched',
          '👤 Admin Authentication - Secure JWT-based login with 24-hour tokens',
          '📊 Admin Dashboard - Real-time statistics (users, plans, activity)',
          '👥 User Management - View, search, and manage registered users',
          '🛡️ Admin User Management - Create/delete admin accounts with role control',
          '🤖 AI Configuration - Adjust AI model settings (provider, model, temperature, tokens)',
          '🔑 API Key Management - Secure storage with AES-256 encryption',
          '⚙️ Global Settings - App-wide configuration (notifications, limits, features)',
          '📝 Activity Log - Complete audit trail of all admin actions',
          '🔒 Super Admin Role - Elevated permissions for sensitive operations',
        ],
        improvements: [
          'Separate authentication system from main app',
          'Password security with bcrypt (10 rounds)',
          'IP address tracking for all admin actions',
          'Cannot delete own admin account (safety)',
          'Real-time stats with dual database connections',
          'Search and pagination for user lists',
          'Type-aware settings (boolean, number, string)',
          'Responsive sidebar with collapsible navigation',
        ],
        technical: [
          '5 new database tables (admin_users, ai_model_configs, api_keys, global_settings, admin_activity_log)',
          'CommonJS (.cjs) backend for compatibility',
          'Dual database architecture (admin + app databases)',
          '30+ API endpoints at /api/admin/*',
          'Frontend routes at /admin/*',
          'Migration: 007_add_admin_system.cjs',
          'First admin creation script included',
        ],
        fixes: [
          '🐛 Fixed admin dashboard showing 0 metrics (database connection issue)',
          '🐛 Fixed sidebar footer overlapping content on scroll',
          '🐛 Fixed missing activeToday metric in stats endpoint',
        ],
      },
    },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'major': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'minor': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'patch': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Admin Panel Changelog
        </h1>
        <p className="text-gray-600 mt-2">
          Track all updates, features, and improvements to the RiderLabs Admin Panel
        </p>
      </div>

      {/* Version List */}
      <div className="space-y-6">
        {versions.map((release) => (
          <Card key={release.version} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">v{release.version}</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(release.type)}`}>
                    {release.type.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{release.date}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {release.changes.features && release.changes.features.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    New Features
                  </h4>
                  <ul className="space-y-1">
                    {release.changes.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {release.changes.improvements && release.changes.improvements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    Improvements
                  </h4>
                  <ul className="space-y-1">
                    {release.changes.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {release.changes.technical && release.changes.technical.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-500" />
                    Technical Details
                  </h4>
                  <ul className="space-y-1">
                    {release.changes.technical.map((tech, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                        <span>{tech}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {release.changes.fixes && release.changes.fixes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Bug className="w-4 h-4 text-red-500" />
                    Bug Fixes
                  </h4>
                  <ul className="space-y-1">
                    {release.changes.fixes.map((fix, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-6 border-t border-gray-200">
        <p className="mb-2">
          <strong>Admin Panel v1.0</strong> - Initial Release
        </p>
        <p>
          Separate from main app changelog. For user-facing changes, see the main changelog.
        </p>
      </div>
    </div>
  );
};

export default AdminChangelog;
