import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';

const AvatarUpload = ({ currentAvatar, onAvatarUpdate, isLoading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Helper to get full avatar URL
  const getAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:5001${url}`;
  };

  const handleFile = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!preview) return;

    // Convert preview back to file for upload
    const response = await fetch(preview);
    const blob = await response.blob();
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setUploadProgress(10);

      const sessionToken = localStorage.getItem('session_token');
      const uploadResponse = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      setUploadProgress(50);

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await uploadResponse.json();
      setUploadProgress(100);

      if (result.success) {
        onAvatarUpdate(result.avatarUrl);
        setPreview(null);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.message || 'Failed to upload avatar');
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch('/api/auth/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      const result = await response.json();
      if (result.success) {
        onAvatarUpdate(null);
        setPreview(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message || 'Failed to delete avatar');
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Profile Avatar
        </CardTitle>
        <CardDescription>
          Upload a profile picture to personalize your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
              {currentAvatar ? (
                <img
                  src={getAvatarUrl(currentAvatar)}
                  alt="Current avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {currentAvatar ? 'Current Avatar' : 'No Avatar'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentAvatar ? 'Click below to update' : 'Upload an image to get started'}
            </p>
            {currentAvatar && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Upload Area */}
        {!preview ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {dragActive ? 'Drop your image here' : 'Upload Avatar'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              JPEG, PNG, or WebP • Max 5MB • Will be resized to 200x200
            </p>
          </div>
        ) : (
          /* Preview */
          <div className="space-y-4">
            <div className="relative mx-auto w-32">
              <img
                src={preview}
                alt="Avatar preview"
                className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-blue-200 dark:border-blue-800"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={cancelPreview}
                disabled={isLoading}
                className="absolute -top-2 -right-2 rounded-full bg-white dark:bg-gray-800 shadow-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleUpload}
                disabled={isLoading || uploadProgress > 0}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Save Avatar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={cancelPreview}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvatarUpload;
