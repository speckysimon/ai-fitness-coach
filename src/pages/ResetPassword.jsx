import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setError('Invalid reset link. Please request a new password reset.');
            setValidating(false);
            return;
        }

        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/auth/validate-reset-token/${token}`);
            const data = await response.json();

            if (data.valid) {
                setTokenValid(true);
            } else {
                setError('This reset link has expired or is invalid. Please request a new password reset.');
            }
        } catch (err) {
            console.error('Token validation error:', err);
            setError('Failed to verify reset link. Please try again.');
        } finally {
            setValidating(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const getPasswordStrength = (password) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 10) return { strength: 1, label: 'Too short', color: 'bg-red-500' };

        let strength = 0;
        if (password.length >= 10) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength === 2) return { strength: 2, label: 'Weak', color: 'bg-orange-500' };
        if (strength === 3) return { strength: 3, label: 'Good', color: 'bg-yellow-500' };
        if (strength === 4) return { strength: 4, label: 'Strong', color: 'bg-green-500' };
        return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (!formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 10) {
            setError('Password must be at least 10 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password');
                setLoading(false);
                return;
            }

            if (data.success) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            console.error('Reset password error:', err);
            setError('Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(formData.password);

    if (validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <img src="/favicon.svg" alt="RiderLabs" className="w-10 h-10 sm:w-12 sm:h-12" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">RiderLabs</h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Where Performance is Engineered</p>
                </div>

                {!tokenValid ? (
                    <Card>
                        <CardContent className="p-6 sm:p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Invalid Reset Link
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                                {error}
                            </p>
                            <Link to="/forgot-password">
                                <Button className="min-h-[44px]">
                                    Request New Reset Link
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : success ? (
                    <Card>
                        <CardContent className="p-6 sm:p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Password Reset Successful!
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                                Your password has been updated. Redirecting to login...
                            </p>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                                Create New Password
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Choose a strong password for your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                                {/* New Password */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter new password"
                                            className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-12 text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Password Strength Indicator */}
                                    {formData.password && (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${passwordStrength.color}`}
                                                        style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`text-xs font-medium ${passwordStrength.strength === 4 ? 'text-green-600 dark:text-green-400' :
                                                        passwordStrength.strength === 3 ? 'text-yellow-600 dark:text-yellow-400' :
                                                            'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {passwordStrength.label}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Password Requirements */}
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Password must contain:</p>
                                        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                            <li className={formData.password.length >= 10 ? 'text-green-600 dark:text-green-400' : ''}>
                                                • At least 10 characters
                                            </li>
                                            <li className={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                                                • Uppercase and lowercase letters
                                            </li>
                                            <li className={/[0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                                                • At least one number
                                            </li>
                                            <li className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                                                • At least one special character
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="Confirm new password"
                                            className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-12 text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading || formData.password !== formData.confirmPassword}
                                    className="w-full min-h-[44px]"
                                    size="lg"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Resetting Password...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4 mr-2" />
                                            Reset Password
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-4 sm:mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
