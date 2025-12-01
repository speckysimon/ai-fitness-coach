import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

const DemoUserCreator = ({ onUserCreated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const createDemoUser = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Generate random email to avoid conflicts
            const randomId = Math.floor(Math.random() * 10000);
            const email = `demo${randomId}@example.com`;
            const password = 'password123';
            const name = `Demo User ${randomId}`;

            const response = await fetch('/api/demo/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create demo user');
            }

            setSuccess({
                email,
                password,
                name
            });

            if (onUserCreated) {
                onUserCreated(data.user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-8 border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
                    <UserPlus className="w-5 h-5" />
                    Create Demo User
                </CardTitle>
                <CardDescription className="text-purple-600 dark:text-purple-400">
                    Create a test account with mock Strava data (bypasses API limits)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-2 font-medium">
                                <CheckCircle2 className="w-5 h-5" />
                                User Created Successfully!
                            </div>
                            <div className="space-y-1 text-sm font-mono bg-white/50 dark:bg-black/20 p-2 rounded">
                                <p>Email: {success.email}</p>
                                <p>Password: {success.password}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setSuccess(null)}
                            variant="outline"
                            className="w-full"
                        >
                            Create Another
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={createDemoUser}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {loading ? 'Creating...' : 'Generate Demo User'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export default DemoUserCreator;
