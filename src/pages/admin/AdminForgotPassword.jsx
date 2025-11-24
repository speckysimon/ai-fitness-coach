import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardDescription as CardDescription, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';

const AdminForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email) {
            setError('Email is required');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok || data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'Failed to request password reset');
            }
        } catch (err) {
            console.error('Admin forgot password error:', err);
            setError('Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-2xl">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">RiderLabs Admin</h1>
                    <p className="text-blue-200">Secure Administration Portal</p>
                </div>

                {!success ? (
                    <Card className="shadow-2xl border-0">
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Mail className="w-6 h-6" />
                                Reset Admin Password
                            </CardTitle>
                            <CardDescription>
                                Enter your admin email to receive a reset link
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Admin Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@riderlabs.io"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={loading}
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Reset Link
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    to="/admin/login"
                                    className="text-sm text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Admin Login
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-2xl border-0">
                        <CardContent className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                Check Your Email
                            </h2>
                            <p className="text-gray-600 mb-6">
                                If an admin account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                            </p>
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                                <p className="text-sm text-yellow-800">
                                    ⏱️ The reset link will expire in <strong>1 hour</strong>
                                </p>
                            </div>
                            <Link
                                to="/admin/login"
                                className="text-sm text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Admin Login
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-blue-200">
                        🔒 All admin password reset requests are logged and monitored
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminForgotPassword;
