/**
 * Centralised manual override management for FTP and FTHR
 * Single source of truth for manual override logic
 * 
 * Rules:
 * - Manual overrides take precedence over calculated values
 * - Backend still calculates, but frontend displays manual if set
 * - Clear separation between "calculated" and "manual" values
 */

const STORAGE_KEYS = {
  MANUAL_FTP: 'manual_ftp',
  MANUAL_FTHR: 'manual_fthr',
};

/**
 * Get manual FTP override if set
 * @returns {number|null} - Manual FTP value or null if not set
 */
export function getManualFTP() {
  const value = localStorage.getItem(STORAGE_KEYS.MANUAL_FTP);
  if (value) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Set manual FTP override
 * @param {number|null} value - FTP value to set, or null to clear
 */
export function setManualFTP(value) {
  if (value === null || value === undefined || value === '') {
    localStorage.removeItem(STORAGE_KEYS.MANUAL_FTP);
  } else {
    localStorage.setItem(STORAGE_KEYS.MANUAL_FTP, value.toString());
  }
}

/**
 * Get manual FTHR override if set
 * @returns {number|null} - Manual FTHR value or null if not set
 */
export function getManualFTHR() {
  const value = localStorage.getItem(STORAGE_KEYS.MANUAL_FTHR);
  if (value) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Set manual FTHR override
 * @param {number|null} value - FTHR value to set, or null to clear
 */
export function setManualFTHR(value) {
  if (value === null || value === undefined || value === '') {
    localStorage.removeItem(STORAGE_KEYS.MANUAL_FTHR);
  } else {
    localStorage.setItem(STORAGE_KEYS.MANUAL_FTHR, value.toString());
  }
}

/**
 * Get effective FTP value (manual override takes precedence)
 * @param {Object} backendResponse - Response from /api/analytics/ftp
 * @returns {Object} - { value, isManual, backendValue, confidence }
 */
export function getEffectiveFTP(backendResponse) {
  const manualFTP = getManualFTP();
  const backendFTP = backendResponse?.ftp || null;
  
  if (manualFTP !== null) {
    return {
      value: manualFTP,
      isManual: true,
      backendValue: backendFTP,
      confidence: 100,
      confidenceLevel: 'manual',
      method: 'manual_override',
    };
  }
  
  return {
    value: backendFTP,
    isManual: false,
    backendValue: backendFTP,
    confidence: backendResponse?.confidence || 0,
    confidenceLevel: backendResponse?.confidenceLevel || 'none',
    method: backendResponse?.method || 'unknown',
  };
}

/**
 * Get effective FTHR value (manual override takes precedence)
 * @param {Object} backendResponse - Response from /api/analytics/fthr
 * @returns {Object} - { value, isManual, backendValue, confidence, zones }
 */
export function getEffectiveFTHR(backendResponse) {
  const manualFTHR = getManualFTHR();
  const backendFTHR = backendResponse?.fthr || null;
  
  if (manualFTHR !== null) {
    // Calculate zones from manual FTHR
    const zones = calculateHRZonesFromFTHR(manualFTHR);
    return {
      value: manualFTHR,
      isManual: true,
      backendValue: backendFTHR,
      confidence: 100,
      confidenceLevel: 'manual',
      method: 'manual_override',
      zones,
    };
  }
  
  return {
    value: backendFTHR,
    isManual: false,
    backendValue: backendFTHR,
    confidence: backendResponse?.confidence || 0,
    confidenceLevel: backendResponse?.confidenceLevel || 'none',
    method: backendResponse?.method || 'unknown',
    zones: backendResponse?.zones || null,
  };
}

/**
 * Calculate HR zones from FTHR (5-zone Coggan model)
 * @param {number} fthr - Functional Threshold Heart Rate
 * @returns {Object} - HR zones
 */
function calculateHRZonesFromFTHR(fthr) {
  if (!fthr || fthr < 100) return null;
  
  return {
    zone1: { min: Math.round(fthr * 0.68), max: Math.round(fthr * 0.83), name: 'Active Recovery' },
    zone2: { min: Math.round(fthr * 0.83), max: Math.round(fthr * 0.94), name: 'Endurance' },
    zone3: { min: Math.round(fthr * 0.94), max: Math.round(fthr * 1.00), name: 'Tempo' },
    zone4: { min: Math.round(fthr * 1.00), max: Math.round(fthr * 1.03), name: 'Threshold' },
    zone5: { min: Math.round(fthr * 1.03), max: Math.round(fthr * 1.06), name: 'VO2max' },
  };
}

/**
 * Check if manual override is set for FTP
 * @returns {boolean}
 */
export function hasManualFTP() {
  return getManualFTP() !== null;
}

/**
 * Check if manual override is set for FTHR
 * @returns {boolean}
 */
export function hasManualFTHR() {
  return getManualFTHR() !== null;
}

/**
 * Clear all manual overrides
 */
export function clearAllManualOverrides() {
  localStorage.removeItem(STORAGE_KEYS.MANUAL_FTP);
  localStorage.removeItem(STORAGE_KEYS.MANUAL_FTHR);
}

export default {
  getManualFTP,
  setManualFTP,
  getManualFTHR,
  setManualFTHR,
  getEffectiveFTP,
  getEffectiveFTHR,
  hasManualFTP,
  hasManualFTHR,
  clearAllManualOverrides,
};
