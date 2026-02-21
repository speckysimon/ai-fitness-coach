import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const STATUS_LABELS = {
  created: 'New activity created',
  matched: 'Matched to existing activity',
  duplicate: 'Already uploaded',
};

const FitUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (uploading) return;
    reset();
    onClose();
  }, [uploading, reset, onClose]);

  const validateFile = (f) => {
    if (!f) return 'No file selected';
    if (!f.name.toLowerCase().endsWith('.fit')) return 'Only .fit files are accepted';
    if (f.size > 25 * 1024 * 1024) return 'File exceeds 25 MB limit';
    return null;
  };

  const handleFileSelect = (f) => {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        throw new Error('Not logged in. Please log in and try again.');
      }

      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);

      const response = await fetch('/api/activities/upload-fit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      setProgress(80);

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setProgress(100);
      setResult(data.data);

      // Notify parent to refresh activities list
      if (onSuccess) {
        setTimeout(() => onSuccess(data.data), 500);
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const formatDistance = (metres) => {
    if (!metres) return '-';
    return `${(metres / 1000).toFixed(1)} km`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Upload Activity (.fit)
          </h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          {!result && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3 p-8
                border-2 border-dashed rounded-xl cursor-pointer transition-all
                ${dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : file
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".fit"
                onChange={handleInputChange}
                className="hidden"
              />

              {file ? (
                <>
                  <FileCheck className="w-10 h-10 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(0)} KB — Click or drop to replace
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  <div className="text-center">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      Drag and drop your .fit file here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      or click to browse — max 25 MB
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading and parsing...</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">Upload failed</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    {STATUS_LABELS[result.status] || 'Upload complete'}
                  </p>
                  {result.status === 'matched' && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Confidence: {Math.round(result.match_confidence * 100)}% — data merged with existing activity
                    </p>
                  )}
                  {result.status === 'duplicate' && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      {result.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Extracted Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Name</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{result.summary.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Sport</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{result.summary.sport || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Duration</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatDuration(result.summary.duration_s)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Distance</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatDistance(result.summary.distance_m)}</p>
                    </div>
                    {result.summary.avg_power > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg Power</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{result.summary.avg_power}W</p>
                      </div>
                    )}
                    {result.summary.avg_hr > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg HR</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{result.summary.avg_hr} bpm</p>
                      </div>
                    )}
                    {result.summary.elevation_m > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Elevation</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{result.summary.elevation_m}m</p>
                      </div>
                    )}
                    {result.summary.calories > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Calories</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{result.summary.calories} kcal</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {result ? (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={uploading}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FitUploadModal;
