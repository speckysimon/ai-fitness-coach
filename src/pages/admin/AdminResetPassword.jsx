import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardDescription as CardDescription, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';

const AdminResetPassword = () => {
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
            const response = await fetch(`/api/admin/validate-reset-token/${token}`);
            const data = await response.json();

            if (data.valid) {
                setTokenValid(true);
            } else {
                setError('This reset link has expired or is invalid.');
            }
        } catch (err) {
            console.error('Token validation error:', err);
            setError('Failed to verify reset link.');
        } finally {
            setValidating(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

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
            const response = await fetch('/api/admin/reset-password', {
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
                setTimeout(() => {
                    navigate('/admin/login');
                }, 3000);
            }
        } catch (err) {
            console.error('Reset password error:', err);
            setError('Failed to connect to server.');
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-blue-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-blue-200">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-blue-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-2xl">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">RiderLabs Admin</h1>
                    <p className="text-blue-200">Secure Administration Portal</p>
                </div>

                {!tokenValid ? (
                    <Card className="shadow-2xl border-0">
                        <CardContent className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                Invalid Reset Link
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {error}
                            </p>
                            <Link to="/admin/forgot-password">
                                <Button>Request New Reset Link</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : success ? (
                    <Card className="shadow-2xl border-0">
                        <CardContent className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                Password Reset Successful!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Your admin password has been updated. Redirecting to login...
                            </p>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-2xl border-0">
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Lock className="w-6 h-6" />
                                Create New Admin Password
                            </CardTitle>
                            <CardDescription>
                                Choose a strong password for  your admin account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter new password"
                                            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <ul className="mt-2 text-xs text-gray-500 space-y-1">
                                        <li className={formData.password.length >= 10 ? 'text-green-600' : ''}>
                                            • At least 10 characters
                                        </li>
                                        <li className={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>
                                            • Uppercase and lowercase letters
                                        </li>
                                        <li className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                                            • At least one number
                                        </li>
                                        <li className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                                            • At least one special character
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="Confirm new password"
                                            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                        <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading || formData.password !== formData.confirmPassword}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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

                            <div className="mt-6 text-center">
                                <Link to="/admin/login" className="text-sm text-gray-600 hover:text-gray-800 font-medium">
                                    Back to Admin Login
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AdminResetPassword;
