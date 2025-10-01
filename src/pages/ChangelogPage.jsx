import React from 'react';
import { Package, CheckCircle, Bug, Sparkles, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const ChangelogPage = () => {
  const versions = [
    {
      version: '1.3.0',
      date: '2025-10-01',
      type: 'major',
      changes: {
        features: [
          'Upcoming workout card on Dashboard with notification icon',
          'Estimated TSS on upcoming workout with traffic light colors',
          'Training Volume chart with 1w/2w/4w/6w time period selector',
          'Training Load (TSS) chart with color-coded intensity zones',
          'Color-changing form line on Fitness & Form page',
          'Clickable upcoming workout card with full session details',
          'Independent time period controls for volume and TSS charts',
          'Session hover modals on Calendar for planned workouts',
          'Training plan persistence across page navigation',
        ],
        improvements: [
          'Dashboard error handling with retry and re-authentication',
          'Error banner shows when refresh fails but cached data exists',
          'Navigation menu reordered (Dashboard, Calendar, Plan Generator, Form, FTP)',
          'TSS calculation in backend trends API',
          'Better empty state handling for charts',
          'Enhanced tooltips showing load levels',
          'Improved chart legends and descriptions',
        ],
        fixes: [
          'Fixed Dashboard blank page issue on browser return',
          'Fixed TSS chart rendering with multiple overlapping lines',
          'Fixed independent chart controls (volume vs TSS)',
          'Fixed form line rendering issues on Fitness page',
          'Fixed training plan loading on component mount',
        ],
      },
    },
    {
      version: '1.2.0',
      date: '2025-09-30',
      type: 'major',
      changes: {
        features: [
          'Start date field with automatic duration calculation',
          'Session dates displayed chronologically',
          'Confetti celebration on 100% plan completion',
          'Add to Calendar button (always visible)',
          'Regenerate Plan button with progress reset',
          'Automatic taper week (50% volume reduction)',
          'Proper periodization: Base → Build → Peak → Taper',
          'AI instructions updated for scientific tapering',
        ],
        improvements: [
          'Calendar sync with proper dates and times',
          'Detailed event descriptions with targets',
          'Smart error handling for missing Google connection',
          'Better date display formatting',
        ],
        fixes: [
          'Fixed chronological date ordering',
          'Fixed missing icon imports',
          'Corrected timezone handling',
          'Fixed week-based date calculations',
        ],
      },
    },
    {
      version: '1.1.0',
      date: '2025-09-30',
      type: 'major',
      changes: {
        features: [
          'Interactive session details with click-to-view modal',
          'Detailed zone breakdowns (time in each power/HR zone)',
          'Specific wattage targets based on FTP',
          'Zwift workout recommendations',
          'All Activities page with search and filtering',
          'FTP History page with interactive graphs',
          'Methodology page with scientific documentation',
          'Activity detail modals with comprehensive stats',
          'Smart activity icons (Zwift, indoor/outdoor)',
          'Traffic light load-based color coding',
        ],
        improvements: [
          'TSS calculation on all activities',
          'Data persistence and caching',
          'Consistent UI/UX across all pages',
        ],
      },
    },
    {
      version: '1.0.1',
      date: '2025-09-30',
      type: 'patch',
      changes: {
        fixes: [
          'Port conflict: Changed default port from 5000 to 5001',
          'OAuth redirect: Fixed Strava and Google callbacks',
          'OpenAI initialization: Fixed lazy initialization',
          'Activity sorting: Reverse chronological order',
        ],
        improvements: [
          'Updated redirect URIs to use port 5001',
          'Updated Vite proxy configuration',
          'Improved environment variable handling',
        ],
      },
    },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'major': return 'bg-blue-100 text-blue-700';
      case 'minor': return 'bg-green-100 text-green-700';
      case 'patch': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          Changelog
        </h1>
        <p className="text-gray-600 mt-2">
          Track all updates, new features, and improvements to AI Fitness Coach
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
                    <BookOpen className="w-4 h-4 text-purple-500" />
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
      <div className="text-center text-sm text-gray-500 py-6 border-t">
        <p>
          For detailed technical changes, see the{' '}
          <a href="https://github.com/yourusername/ai-fitness-coach" className="text-blue-600 hover:underline">
            GitHub repository
          </a>
        </p>
      </div>
    </div>
  );
};

export default ChangelogPage;
