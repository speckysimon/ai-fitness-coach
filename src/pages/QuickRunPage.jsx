import React, { useState } from 'react';
import { Terminal, Play, Copy, CheckCircle, Package, Server, Globe, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const QuickRunPage = () => {
  const [copiedCommand, setCopiedCommand] = useState(null);

  const copyToClipboard = (text, commandId) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(commandId);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const commands = [
    {
      id: 'install',
      title: 'Install Dependencies',
      description: 'Install all required npm packages',
      icon: Package,
      command: 'npm install',
      color: 'blue',
    },
    {
      id: 'dev',
      title: 'Start Development Server',
      description: 'Runs both backend (port 5001) and frontend (port 3000) concurrently',
      icon: Rocket,
      command: 'npm run dev',
      color: 'green',
      primary: true,
    },
    {
      id: 'server',
      title: 'Start Backend Only',
      description: 'Run only the Express server on port 5001',
      icon: Server,
      command: 'npm run server',
      color: 'purple',
    },
    {
      id: 'client',
      title: 'Start Frontend Only',
      description: 'Run only the Vite dev server on port 3000',
      icon: Globe,
      command: 'npm run client',
      color: 'orange',
    },
    {
      id: 'build',
      title: 'Build for Production',
      description: 'Create optimized production build',
      icon: Package,
      command: 'npm run build',
      color: 'gray',
    },
  ];

  const setupSteps = [
    {
      step: 1,
      title: 'Navigate to project directory',
      command: 'cd /Users/simonosx/CascadeProjects/ai-fitness-coach',
    },
    {
      step: 2,
      title: 'Install dependencies (first time only)',
      command: 'npm install',
    },
    {
      step: 3,
      title: 'Configure environment variables',
      description: 'Make sure .env file is configured with your API keys',
    },
    {
      step: 4,
      title: 'Start the application',
      command: 'npm run dev',
    },
    {
      step: 5,
      title: 'Open in browser',
      description: 'Navigate to http://localhost:3000',
    },
  ];

  const getColorClasses = (color, isPrimary = false) => {
    const colors = {
      blue: isPrimary ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 border-blue-200',
      green: isPrimary ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 border-green-200',
      purple: isPrimary ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-700 border-purple-200',
      orange: isPrimary ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border-orange-200',
      gray: isPrimary ? 'bg-gray-500 text-white' : 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Terminal className="w-8 h-8 text-green-600" />
          Quick Run
        </h1>
        <p className="text-gray-600 mt-2">
          Essential terminal commands to get the AI Fitness Coach app up and running
        </p>
      </div>

      {/* Quick Start Steps */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setupSteps.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-semibold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
                  {step.command && (
                    <div className="flex items-center gap-2 bg-gray-900 text-green-400 px-4 py-2 rounded-lg font-mono text-sm">
                      <Terminal className="w-4 h-4 flex-shrink-0" />
                      <code className="flex-1">{step.command}</code>
                      <button
                        onClick={() => copyToClipboard(step.command, `step-${step.step}`)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedCommand === `step-${step.step}` ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {step.description && (
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Commands */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Commands</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {commands.map((cmd) => {
            const Icon = cmd.icon;
            const isPrimary = cmd.primary;
            return (
              <Card
                key={cmd.id}
                className={`transition-all hover:shadow-md ${
                  isPrimary ? 'border-2 border-green-500 shadow-sm' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isPrimary ? getColorClasses(cmd.color, true) : getColorClasses(cmd.color)
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cmd.title}</CardTitle>
                        {isPrimary && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{cmd.description}</p>
                  <div className="flex items-center gap-2 bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm">
                    <Terminal className="w-4 h-4 flex-shrink-0" />
                    <code className="flex-1">{cmd.command}</code>
                    <button
                      onClick={() => copyToClipboard(cmd.command, cmd.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedCommand === cmd.id ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Terminal className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Important Notes</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Backend runs on <strong>port 5001</strong>, Frontend on <strong>port 3000</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Make sure your <code className="bg-blue-100 px-1 rounded">.env</code> file is configured before starting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Use <code className="bg-blue-100 px-1 rounded">npm run dev</code> for development (recommended)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Check <code className="bg-blue-100 px-1 rounded">SETUP_GUIDE.md</code> for detailed setup instructions</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickRunPage;
