import React, { useState, useEffect } from 'react';
import { User, Save, Calendar, Ruler, Weight, Users, Mail, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import AvatarUpload from '../components/AvatarUpload';

const UserProfile = ({ userProfile, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        age: userProfile.age || '',
        height: userProfile.height || '',
        weight: userProfile.weight || '',
        gender: userProfile.gender || '',
      });
      setAvatarUrl(userProfile.avatar_url || null);
    }
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const updatedProfile = {
        ...userProfile,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        gender: formData.gender || null,
        updatedAt: new Date().toISOString(),
      };

      // Save to database via API
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          name: updatedProfile.name,
          age: updatedProfile.age,
          height: updatedProfile.height,
          weight: updatedProfile.weight,
          gender: updatedProfile.gender
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save profile to database');
      }

      // Also save to localStorage as cache
      localStorage.setItem('current_user', JSON.stringify(updatedProfile));
      localStorage.setItem(`user_profile_${userProfile.email}`, JSON.stringify(updatedProfile));

      onProfileUpdate(updatedProfile);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: userProfile.name || '',
      age: userProfile.age || '',
      height: userProfile.height || '',
      weight: userProfile.weight || '',
      gender: userProfile.gender || '',
    });
    setIsEditing(false);
  };

  const handleAvatarUpdate = async (newAvatarUrl) => {
    setAvatarLoading(true);
    try {
      setAvatarUrl(newAvatarUrl);
      
      // Update user profile with new avatar
      const updatedProfile = {
        ...userProfile,
        avatar_url: newAvatarUrl,
        updatedAt: new Date().toISOString(),
      };
      
      // Save to localStorage
      localStorage.setItem('current_user', JSON.stringify(updatedProfile));
      localStorage.setItem(`user_profile_${userProfile.email}`, JSON.stringify(updatedProfile));
      
      onProfileUpdate(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating avatar:', error);
    } finally {
      setAvatarLoading(false);
    }
  };

  const calculateBMI = () => {
    if (formData.height && formData.weight) {
      const heightInMeters = parseFloat(formData.height) / 100;
      const bmi = parseFloat(formData.weight) / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const calculateAge = () => {
    if (formData.age) {
      return parseInt(formData.age);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { text: 'Underweight', color: 'text-blue-600' };
    if (bmiValue < 25) return { text: 'Normal', color: 'text-green-600' };
    if (bmiValue < 30) return { text: 'Overweight', color: 'text-yellow-600' };
    return { text: 'Obese', color: 'text-red-600' };
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
          User Profile
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
          Manage your basic personal information. For performance metrics and training zones, visit the <a href="/rider-profile" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium">Rider Profile</a> page.
        </p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm sm:text-base text-green-700 dark:text-green-300 font-medium">Profile updated successfully!</p>
        </div>
      )}

      {/* Avatar Upload */}
      <AvatarUpload
        currentAvatar={avatarUrl}
        onAvatarUpdate={handleAvatarUpdate}
        isLoading={avatarLoading}
      />

      {/* Profile Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl">Personal Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                This data helps personalize your training recommendations
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="min-h-[44px] w-full sm:w-auto">
                <Edit2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={handleSave} size="sm" className="min-h-[44px] flex-1 sm:flex-none">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm" className="min-h-[44px] flex-1 sm:flex-none">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed min-h-[44px]"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="John Doe"
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  !isEditing ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                }`}
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="30"
                min="13"
                max="100"
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  !isEditing ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                }`}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  !isEditing ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                }`}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Height (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="175"
                min="100"
                max="250"
                step="0.1"
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  !isEditing ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                }`}
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Weight className="w-4 h-4" />
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="70"
                min="30"
                max="200"
                step="0.1"
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  !isEditing ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BMI Card */}
      {bmi && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Body Mass Index (BMI)</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Calculated from your height and weight
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600 dark:text-blue-400">
                {bmi}
              </div>
              {bmiCategory && (
                <div>
                  <div className={`text-lg sm:text-xl md:text-2xl font-semibold ${bmiCategory.color}`}>
                    {bmiCategory.text}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    BMI Category
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserProfile;
