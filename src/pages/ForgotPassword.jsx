import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const ForgotPassword = () => {
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

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/forgot-password', {
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
            console.error('Forgot password error:', err);
            setError('Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <img src="/favicon.svg" alt="RiderLabs" className="w-10 h-10 sm:w-12 sm:h-12" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">RiderLabs</h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Where Performance is Engineered</p>
                </div>

                {!success ? (
                    <Card>
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                                Forgot Password?
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Enter your email and we'll send you a reset link
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        disabled={loading}
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full min-h-[44px]"
                                    size="lg"
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

                            <div className="mt-4 sm:mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="p-6 sm:p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Check Your Email
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                                If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                            </p>
                            <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-6">
                                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                                    ⏱️ The reset link will expire in <strong>1 hour</strong>
                                </p>
                            </div>
                            <div className="space-y-3">
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    Didn't receive an email? Check your spam folder or try again
                                </p>
                                <Link
                                    to="/login"
                                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Info */}
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <p>
                        Need help? Contact <a href="mailto:support@riderlabs.io" className="text-blue-600 dark:text-blue-400 hover:underline">support@riderlabs.io</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
