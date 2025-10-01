import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/Button';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null;

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-yellow-600';
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'danger': return 'bg-red-100';
      case 'warning': return 'bg-yellow-100';
      case 'info': return 'bg-blue-100';
      default: return 'bg-yellow-100';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${getIconBgColor()}`}>
                <AlertTriangle className={`w-6 h-6 ${getIconColor()}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 whitespace-pre-line">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-lg flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="min-w-[100px]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`min-w-[100px] ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : type === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
