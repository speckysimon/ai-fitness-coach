import React from 'react';
import { cn } from '../../lib/utils';

// Admin-specific Card components with no dark mode support
// These always use light theme colors

const AdminCard = ({ className, ...props }) => (
  <div
    className={cn(
      'rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm',
      className
    )}
    {...props}
  />
);

const AdminCardHeader = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
);

const AdminCardTitle = ({ className, ...props }) => (
  <h3
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight text-gray-900',
      className
    )}
    {...props}
  />
);

const AdminCardDescription = ({ className, ...props }) => (
  <p
    className={cn('text-sm text-gray-600', className)}
    {...props}
  />
);

const AdminCardContent = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

const AdminCardFooter = ({ className, ...props }) => (
  <div
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
);

export { AdminCard, AdminCardHeader, AdminCardFooter, AdminCardTitle, AdminCardDescription, AdminCardContent };
