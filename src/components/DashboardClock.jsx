import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getCurrentDateTime } from '../lib/timezone';

const DashboardClock = () => {
  const [dateTime, setDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setDateTime(getCurrentDateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <Clock className="w-5 h-5 text-blue-600" />
      <div className="flex flex-col">
        <div className="text-lg font-semibold text-gray-900 tabular-nums">
          {dateTime.time}
        </div>
        <div className="text-xs text-gray-600">
          {dateTime.date}
        </div>
      </div>
      <div className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs font-medium text-blue-700">
        {dateTime.timezone.split('/').pop().replace('_', ' ')}
      </div>
    </div>
  );
};

export default DashboardClock;
