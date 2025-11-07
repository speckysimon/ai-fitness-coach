import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const KnownIssuesPage = () => {
  const issues = [
    {
      id: 1,
      title: 'Theme Customization',
      description: 'Custom theme colors are not yet fully applied across all pages. We\'re working on making the theme system more consistent.',
      status: 'in-progress',
      priority: 'high',
      eta: 'Next update',
    },
    {
      id: 2,
      title: 'Dark Mode Consistency',
      description: 'Some text elements may be hard to read in dark mode on certain pages. We\'re actively improving dark mode support.',
      status: 'in-progress',
      priority: 'medium',
      eta: 'Next update',
    },
    {
      id: 3,
      title: 'Chart Labels in Dark Mode',
      description: 'Chart axis labels and tooltips may have reduced visibility in dark mode. Testing and improvements ongoing.',
      status: 'investigating',
      priority: 'low',
      eta: 'Future update',
    },
    {
      id: 4,
      title: 'Mobile Navigation',
      description: 'Mobile menu could benefit from smoother animations and better visual feedback. Enhancement planned.',
      status: 'planned',
      priority: 'low',
      eta: 'Future update',
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in-progress':
        return {
          label: 'In Progress',
          className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          icon: Wrench,
        };
      case 'investigating':
        return {
          label: 'Investigating',
          className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
          icon: Clock,
        };
      case 'planned':
        return {
          label: 'Planned',
          className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          icon: Clock,
        };
      case 'fixed':
        return {
          label: 'Fixed',
          className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
          icon: CheckCircle,
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          icon: AlertTriangle,
        };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'medium':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
          <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400" />
          Known Issues
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
          We're committed to transparency. Here are the issues we're aware of and actively working to resolve.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                We're constantly improving
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This page shows known issues we're working on. Most issues are minor and don't affect core functionality. 
                If you encounter a problem not listed here, please let us know through Settings → About.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        {issues.map((issue) => {
          const statusBadge = getStatusBadge(issue.status);
          const StatusIcon = statusBadge.icon;

          return (
            <Card key={issue.id} className="border-l-4 border-l-orange-500">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-2">
                      {issue.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {issue.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityBadge(issue.priority)}`}>
                      {issue.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Expected: {issue.eta}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t border-gray-200 dark:border-gray-700">
        <p className="mb-2">
          <strong>Last Updated:</strong> November 7, 2025
        </p>
        <p>
          For feature requests and bug reports, please contact us through the Settings page.
        </p>
      </div>
    </div>
  );
};

export default KnownIssuesPage;
