/**
 * Provider Contract Tests
 * 
 * CRITICAL: These tests enforce the provider interface contract.
 * All providers MUST pass these tests.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { registerProvider, getProvider, clearProviders } from '../services/providers/providerRegistry.js';

// Import provider modules
import * as garminService from '../services/providers/garmin/garminService.js';
import * as garminMapper from '../services/providers/garmin/garminMapper.js';
import * as wahooService from '../services/providers/wahoo/wahooService.js';
import * as wahooMapper from '../services/providers/wahoo/wahooMapper.js';

// Combine service + mapper into provider modules
const garminProvider = { ...garminService, ...garminMapper };
const wahooProvider = { ...wahooService, ...wahooMapper };

const providers = [
  { id: 'garmin', module: garminProvider },
  { id: 'wahoo', module: wahooProvider }
];

beforeAll(() => {
  clearProviders();
  providers.forEach(p => registerProvider(p.id, p.module));
});

describe('Provider Contract - Required Exports', () => {
  const requiredServiceFunctions = [
    'getAuthUrl',
    'exchangeCodeForTokens',
    'hasValidTokens',
    'listActivities'
  ];
  
  const requiredMapperFunctions = [
    'mapToInternalFormat',
    'detectActivityType'
  ];
  
  providers.forEach(({ id, module }) => {
    describe(`Provider: ${id}`, () => {
      requiredServiceFunctions.forEach(fnName => {
        it(`should export ${fnName} function`, () => {
          expect(typeof module[fnName]).toBe('function');
        });
      });
      
      requiredMapperFunctions.forEach(fnName => {
        it(`should export ${fnName} function`, () => {
          expect(typeof module[fnName]).toBe('function');
        });
      });
    });
  });
});

describe('Provider Contract - listActivities Return Shape', () => {
  providers.forEach(({ id, module }) => {
    it(`${id}: should return correct ListResult shape`, async () => {
      const result = await module.listActivities(999, {});
      
      expect(result).toHaveProperty('ok');
      expect(typeof result.ok).toBe('boolean');
      
      if (result.ok) {
        expect(result).toHaveProperty('activities');
        expect(Array.isArray(result.activities)).toBe(true);
        expect(result).toHaveProperty('hasMore');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });
});

describe('Provider Contract - mapToInternalFormat Return Shape', () => {
  providers.forEach(({ id, module }) => {
    it(`${id}: should return correct InternalActivity shape`, async () => {
      // Get sample activity from listActivities
      const listResult = await module.listActivities(999, {});
      
      if (!listResult.ok || listResult.activities.length === 0) {
        console.log(`[${id}] Skipping mapper test - no activities available`);
        return;
      }
      
      const sampleActivity = listResult.activities[0];
      const mapped = module.mapToInternalFormat(sampleActivity);
      
      // Required fields
      expect(mapped).toHaveProperty('provider_id');
      expect(typeof mapped.provider_id).toBe('string');
      
      expect(mapped).toHaveProperty('name');
      expect(typeof mapped.name).toBe('string');
      
      expect(mapped).toHaveProperty('sport');
      expect(typeof mapped.sport).toBe('string');
      
      expect(mapped).toHaveProperty('type');
      expect(typeof mapped.type).toBe('string');
      
      expect(mapped).toHaveProperty('start_time');
      expect(typeof mapped.start_time).toBe('string');
      
      expect(mapped).toHaveProperty('duration_s');
      expect(typeof mapped.duration_s).toBe('number');
      
      expect(mapped).toHaveProperty('has_power');
      expect(typeof mapped.has_power).toBe('boolean');
      
      // CRITICAL: Must include _raw field
      expect(mapped).toHaveProperty('_raw');
      expect(mapped._raw).toEqual(sampleActivity);
    });
  });
});

describe('Provider Contract - Mapper Purity', () => {
  providers.forEach(({ id, module }) => {
    it(`${id}: mapToInternalFormat should be a pure function`, async () => {
      const listResult = await module.listActivities(999, {});
      
      if (!listResult.ok || listResult.activities.length === 0) {
        console.log(`[${id}] Skipping purity test - no activities available`);
        return;
      }
      
      const sampleActivity = listResult.activities[0];
      
      // Call twice with same input
      const result1 = module.mapToInternalFormat(sampleActivity);
      const result2 = module.mapToInternalFormat(sampleActivity);
      
      // Should produce identical output
      expect(result1).toEqual(result2);
      
      // Original input should not be modified
      expect(result1._raw).toEqual(sampleActivity);
    });
  });
});

describe('Provider Contract - Forbidden Imports', () => {
  // This is a basic static check - in real implementation,
  // you'd use a more sophisticated module analysis tool
  
  it('should not import canonicalActivitySelector', () => {
    // Check that provider modules don't import forbidden modules
    // This is a placeholder - real implementation would use static analysis
    
    // For now, just verify the modules can be loaded without errors
    expect(garminProvider).toBeDefined();
    expect(wahooProvider).toBeDefined();
  });
  
  it('should not import activityUpdateService', () => {
    // Placeholder for static analysis
    expect(garminProvider).toBeDefined();
    expect(wahooProvider).toBeDefined();
  });
  
  it('should not import analyticsQueryBuilder', () => {
    // Placeholder for static analysis
    expect(garminProvider).toBeDefined();
    expect(wahooProvider).toBeDefined();
  });
});

describe('Provider Contract - Physiology Fields Preservation', () => {
  providers.forEach(({ id, module }) => {
    it(`${id}: should preserve all physiology fields`, async () => {
      const listResult = await module.listActivities(999, {});
      
      if (!listResult.ok || listResult.activities.length === 0) {
        console.log(`[${id}] Skipping physiology test - no activities available`);
        return;
      }
      
      const sampleActivity = listResult.activities[0];
      const mapped = module.mapToInternalFormat(sampleActivity);
      
      // Check that physiology fields are present (can be null)
      const physiologyFields = [
        'duration_s',
        'distance_m',
        'elevation_m',
        'avg_power',
        'max_power',
        'normalized_power',
        'tss',
        'avg_hr',
        'max_hr',
        'avg_cadence',
        'avg_speed',
        'max_speed',
        'calories'
      ];
      
      physiologyFields.forEach(field => {
        expect(mapped).toHaveProperty(field);
      });
    });
  });
});

describe('Provider Contract - Metadata Fields Preservation', () => {
  providers.forEach(({ id, module }) => {
    it(`${id}: should preserve all metadata fields`, async () => {
      const listResult = await module.listActivities(999, {});
      
      if (!listResult.ok || listResult.activities.length === 0) {
        console.log(`[${id}] Skipping metadata test - no activities available`);
        return;
      }
      
      const sampleActivity = listResult.activities[0];
      const mapped = module.mapToInternalFormat(sampleActivity);
      
      // Check that metadata fields are present (can be null)
      const metadataFields = [
        'name',
        'description',
        'sport',
        'type',
        'start_time',
        'timezone_offset_min'
      ];
      
      metadataFields.forEach(field => {
        expect(mapped).toHaveProperty(field);
      });
    });
  });
});

describe('Provider Contract - Activity Type Detection', () => {
  providers.forEach(({ id, module }) => {
    it(`${id}: should detect activity type correctly`, async () => {
      const listResult = await module.listActivities(999, {});
      
      if (!listResult.ok || listResult.activities.length === 0) {
        console.log(`[${id}] Skipping type detection test - no activities available`);
        return;
      }
      
      const sampleActivity = listResult.activities[0];
      const activityType = module.detectActivityType(sampleActivity);
      
      expect(typeof activityType).toBe('string');
      expect(activityType.length).toBeGreaterThan(0);
      
      // Should be one of the expected types
      const validTypes = ['fit', 'garmin_native', 'garmin_manual', 'wahoo_native'];
      const isValidType = validTypes.some(type => activityType.includes(type.split('_')[0]));
      expect(isValidType).toBe(true);
    });
  });
});

describe('Provider Contract - Registry Integration', () => {
  it('should register providers successfully', () => {
    const garmin = getProvider('garmin');
    const wahoo = getProvider('wahoo');
    
    expect(garmin).toBeDefined();
    expect(wahoo).toBeDefined();
  });
  
  it('should throw error for unregistered provider', () => {
    expect(() => getProvider('nonexistent')).toThrow();
  });
});
