import React, { useState, useEffect } from 'react';
import { FileText, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const AIPromptsPage = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(null);
  const [expandedPrompts, setExpandedPrompts] = useState({});

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/ai-prompts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setPrompts(data.prompts);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (promptName, content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPrompt(promptName);
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleExpand = (promptName) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [promptName]: !prev[promptName]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Prompts</h1>
        <p className="text-gray-600 mt-1">
          View the exact prompts sent to AI models for each feature
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> These are the system and user prompts sent to the AI. 
            They include instructions, context, and data formatting requirements. 
            Understanding these prompts helps you see how the AI generates responses.
          </p>
        </CardContent>
      </Card>

      {/* Prompts List */}
      <div className="space-y-6">
        {prompts.map((prompt) => (
          <Card key={prompt.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {prompt.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {prompt.description}
                  </CardDescription>
                  <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    <span>Feature: <strong>{prompt.feature}</strong></span>
                    <span>•</span>
                    <span>Used in: <strong>{prompt.endpoint}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpand(prompt.name)}
                  >
                    {expandedPrompts[prompt.name] ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Expand
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(prompt.name, prompt.systemPrompt + '\n\n' + prompt.userPromptTemplate)}
                  >
                    {copiedPrompt === prompt.name ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {expandedPrompts[prompt.name] && (
              <CardContent className="space-y-4">
                {/* System Prompt */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      SYSTEM PROMPT
                    </div>
                    <span className="text-xs text-gray-500">
                      Defines the AI's role and behavior
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {prompt.systemPrompt}
                    </pre>
                  </div>
                </div>

                {/* User Prompt Template */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      USER PROMPT TEMPLATE
                    </div>
                    <span className="text-xs text-gray-500">
                      The actual request sent with user data
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {prompt.userPromptTemplate}
                    </pre>
                  </div>
                </div>

                {/* Variables Used */}
                {prompt.variables && prompt.variables.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        VARIABLES
                      </div>
                      <span className="text-xs text-gray-500">
                        Dynamic data inserted into the prompt
                      </span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {prompt.variables.map((variable) => (
                          <div key={variable} className="flex items-center gap-2">
                            <code className="text-xs bg-white px-2 py-1 rounded border border-gray-300 font-mono">
                              {variable}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Example Output */}
                {prompt.exampleOutput && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                        EXPECTED OUTPUT FORMAT
                      </div>
                      <span className="text-xs text-gray-500">
                        Structure of the AI response
                      </span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                        {prompt.exampleOutput}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {prompts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No AI prompts found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIPromptsPage;
