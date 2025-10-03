import React, { useState, useEffect } from 'react';
import { User, Save, Calendar, Ruler, Weight, Users, Mail, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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
  const [currentFTP, setCurrentFTP] = useState(null);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        age: userProfile.age || '',
        height: userProfile.height || '',
        weight: userProfile.weight || '',
        gender: userProfile.gender || '',
      });
    }
  }, [userProfile]);

  // Load FTP from cached metrics
  useEffect(() => {
    const cachedMetrics = localStorage.getItem('cached_metrics');
    if (cachedMetrics) {
      try {
        const metrics = JSON.parse(cachedMetrics);
        setCurrentFTP(metrics.ftp || null);
      } catch (error) {
        console.error('Error loading cached metrics:', error);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const updatedProfile = {
      ...userProfile,
      name: formData.name,
      age: formData.age ? parseInt(formData.age) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      gender: formData.gender || null,
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem('current_user', JSON.stringify(updatedProfile));
    localStorage.setItem(`user_profile_${userProfile.email}`, JSON.stringify(updatedProfile));

    onProfileUpdate(updatedProfile);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="w-8 h-8 text-blue-600" />
          User Profile
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your personal information for better training insights
        </p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-700 font-medium">Profile updated successfully!</p>
        </div>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                This data helps personalize your training recommendations
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : ''
                }`}
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : ''
                }`}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : ''
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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : ''
                }`}
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : ''
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculated Metrics */}
      {(formData.height && formData.weight) && (
        <Card>
          <CardHeader>
            <CardTitle>Health Metrics</CardTitle>
            <CardDescription>
              Calculated from your profile data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* BMI */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Body Mass Index (BMI)</div>
                <div className="text-3xl font-bold text-blue-600">{bmi}</div>
                {bmiCategory && (
                  <div className={`text-sm font-medium mt-1 ${bmiCategory.color}`}>
                    {bmiCategory.text}
                  </div>
                )}
              </div>

              {/* Power-to-Weight */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Power-to-Weight</div>
                <div className="text-3xl font-bold text-purple-600">
                  {currentFTP && formData.weight
                    ? (currentFTP / parseFloat(formData.weight)).toFixed(2)
                    : '--'}
                </div>
                <div className="text-sm text-gray-500 mt-1">W/kg</div>
              </div>

              {/* Age Category */}
              {formData.age && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Age Category</div>
                  <div className="text-3xl font-bold text-green-600">
                    {parseInt(formData.age) < 30
                      ? 'U30'
                      : parseInt(formData.age) < 40
                      ? '30-39'
                      : parseInt(formData.age) < 50
                      ? '40-49'
                      : parseInt(formData.age) < 60
                      ? '50-59'
                      : '60+'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Years</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Why we need this information</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Age:</strong> Helps calculate age-graded performance and recovery needs</li>
                <li>• <strong>Height & Weight:</strong> Used for power-to-weight ratios and BMI calculations</li>
                <li>• <strong>Gender:</strong> Assists in providing gender-specific training recommendations</li>
                <li>• All data is stored locally on your device and never shared</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
