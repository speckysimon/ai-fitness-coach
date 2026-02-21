/**
 * Provider Sync Runner
 * 
 * Generic sync runner for all providers.
 * Enforces the integration contract:
 * - Calls provider.listActivities()
 * - Maps via provider.mapToInternalFormat()
 * - Imports via activityImportOrchestrator
 * - Verifies via verifyPostImport() (mandatory)
 */

import { getProvider } from './providerRegistry.js';
import { importActivityBatch, verifyPostImport } from '../activityImportOrchestrator.js';
import { recomputeWeeksForUser, recomputeRecentWeeks, getAffectedWeeks } from '../weeklyRecomputeScheduler.js';

/**
 * Sync activities from a provider
 * 
 * CRITICAL: This is the ONLY way providers should sync activities.
 * 
 * @param {Object} params - Sync parameters
 * @param {number} params.userId - User ID
 * @param {string} params.providerId - Provider ID (e.g., 'garmin', 'wahoo')
 * @param {Date} params.after - Fetch activities after this date
 * @param {Date} params.before - Fetch activities before this date
 * @param {number} params.limit - Max activities to fetch
 * @param {string} params.cursor - Pagination cursor
 * @returns {Promise<Object>} { importStats, integrity, providerStats }
 */
export async function syncProviderActivities({
  userId,
  providerId,
  after,
  before,
  limit,
  cursor
}) {
  console.log(`[ProviderSync] Starting sync: provider=${providerId}, user=${userId}`);
  
  try {
    // 1. Get provider from registry
    const provider = getProvider(providerId);
    
    // 2. Check if user has valid tokens
    if (!provider.hasValidTokens(userId)) {
      return {
        ok: false,
        error: 'NO_VALID_TOKENS',
        message: `User needs to authorize ${providerId} connection`
      };
    }
    
    // 3. Fetch activities from provider
    console.log(`[ProviderSync] Fetching activities from ${providerId}...`);
    
    const listResult = await provider.listActivities(userId, {
      after,
      before,
      limit,
      cursor
    });
    
    if (!listResult.ok) {
      console.error(`[ProviderSync] Failed to fetch from ${providerId}:`, listResult.error);
      return {
        ok: false,
        error: listResult.error,
        message: `Failed to fetch activities from ${providerId}`
      };
    }
    
    const rawActivities = listResult.activities || [];
    console.log(`[ProviderSync] Fetched ${rawActivities.length} activities from ${providerId}`);
    
    // 4. Map activities to internal format
    console.log(`[ProviderSync] Mapping ${rawActivities.length} activities...`);
    
    const mappedActivities = rawActivities.map(activity => {
      try {
        return provider.mapToInternalFormat(activity);
      } catch (error) {
        console.error(`[ProviderSync] Failed to map activity:`, error);
        return null;
      }
    }).filter(Boolean);
    
    console.log(`[ProviderSync] Mapped ${mappedActivities.length} activities`);
    
    // 5. Import through orchestrator (REQUIRED)
    console.log(`[ProviderSync] Importing via orchestrator...`);
    
    const importResults = await importActivityBatch({
      userId,
      provider: providerId,
      activities: mappedActivities,
      typeDetector: provider.detectActivityType
    });
    
    console.log(`[ProviderSync] Import complete: ${importResults.created} created, ${importResults.upgraded} upgraded, ${importResults.attached} attached`);
    
    // 6. MANDATORY: Verify integrity
    console.log(`[ProviderSync] Running post-import verification...`);
    
    const integrity = await verifyPostImport(userId);
    
    if (!integrity.ok) {
      console.error(`[ProviderSync] Integrity violations detected:`, integrity.issues);
    } else {
      console.log(`[ProviderSync] Integrity verification passed`);
    }
    
    // 7. Recompute weekly rollups for affected weeks
    let weeklyResult = null;
    try {
      const changedIds = importResults.changedActivityIds || [];
      if (changedIds.length > 0) {
        const affectedWeeks = getAffectedWeeks(userId, changedIds);
        if (affectedWeeks.length > 0) {
          weeklyResult = await recomputeWeeksForUser(userId, affectedWeeks);
        }
      } else if (importResults.created > 0 || importResults.upgraded > 0) {
        // Fallback: recompute recent 4 weeks if we can't derive affected weeks
        weeklyResult = await recomputeRecentWeeks(userId, 4);
      }
    } catch (weeklyError) {
      console.error(`[ProviderSync] Weekly recompute failed (non-fatal):`, weeklyError.message);
      weeklyResult = { ok: false, error: weeklyError.message };
    }
    
    // 8. Return combined results
    return {
      ok: true,
      importStats: {
        total: importResults.total,
        created: importResults.created,
        upgraded: importResults.upgraded,
        attached: importResults.attached,
        shells: importResults.shells,
        errors: importResults.errors
      },
      integrity: {
        ok: integrity.ok,
        issues: integrity.issues,
        summary: {
          errorCount: integrity.errorCount,
          warningCount: integrity.warningCount
        }
      },
      providerStats: {
        fetched: rawActivities.length,
        mapped: mappedActivities.length,
        cursor: listResult.cursor,
        hasMore: listResult.hasMore,
        ...listResult.providerStats
      },
      weekly: weeklyResult
    };
    
  } catch (error) {
    console.error(`[ProviderSync] Sync failed for ${providerId}:`, error);
    return {
      ok: false,
      error: error.message,
      message: `Sync failed for ${providerId}`
    };
  }
}

/**
 * Sync activities with pagination
 * 
 * Automatically handles pagination to fetch all activities in date range.
 * 
 * @param {Object} params - Sync parameters
 * @param {number} params.userId - User ID
 * @param {string} params.providerId - Provider ID
 * @param {Date} params.after - Fetch activities after this date
 * @param {Date} params.before - Fetch activities before this date
 * @param {number} params.pageSize - Activities per page (default: 100)
 * @param {number} params.maxPages - Max pages to fetch (default: 10)
 * @returns {Promise<Object>} Combined results from all pages
 */
export async function syncProviderActivitiesWithPagination({
  userId,
  providerId,
  after,
  before,
  pageSize = 100,
  maxPages = 10
}) {
  console.log(`[ProviderSync] Starting paginated sync: provider=${providerId}, user=${userId}, maxPages=${maxPages}`);
  
  const combinedStats = {
    totalFetched: 0,
    totalCreated: 0,
    totalUpgraded: 0,
    totalAttached: 0,
    totalShells: 0,
    totalErrors: 0,
    pagesProcessed: 0
  };
  
  let cursor = null;
  let hasMore = true;
  let page = 0;
  
  while (hasMore && page < maxPages) {
    page++;
    console.log(`[ProviderSync] Fetching page ${page}...`);
    
    const result = await syncProviderActivities({
      userId,
      providerId,
      after,
      before,
      limit: pageSize,
      cursor
    });
    
    if (!result.ok) {
      console.error(`[ProviderSync] Page ${page} failed:`, result.error);
      break;
    }
    
    // Accumulate stats
    combinedStats.totalFetched += result.providerStats.fetched;
    combinedStats.totalCreated += result.importStats.created;
    combinedStats.totalUpgraded += result.importStats.upgraded;
    combinedStats.totalAttached += result.importStats.attached;
    combinedStats.totalShells += result.importStats.shells;
    combinedStats.totalErrors += result.importStats.errors;
    combinedStats.pagesProcessed = page;
    
    // Check if more pages available
    cursor = result.providerStats.cursor;
    hasMore = result.providerStats.hasMore;
    
    if (!hasMore) {
      console.log(`[ProviderSync] No more pages available`);
      break;
    }
  }
  
  console.log(`[ProviderSync] Paginated sync complete: ${combinedStats.pagesProcessed} pages, ${combinedStats.totalFetched} activities fetched`);
  
  // Final integrity check
  const integrity = await verifyPostImport(userId);
  
  // Recompute weekly rollups after paginated sync
  let weeklyResult = null;
  try {
    if (combinedStats.totalCreated > 0 || combinedStats.totalUpgraded > 0) {
      weeklyResult = await recomputeRecentWeeks(userId, 4);
    }
  } catch (weeklyError) {
    console.error(`[ProviderSync] Weekly recompute failed (non-fatal):`, weeklyError.message);
    weeklyResult = { ok: false, error: weeklyError.message };
  }
  
  return {
    ok: true,
    importStats: {
      total: combinedStats.totalFetched,
      created: combinedStats.totalCreated,
      upgraded: combinedStats.totalUpgraded,
      attached: combinedStats.totalAttached,
      shells: combinedStats.totalShells,
      errors: combinedStats.totalErrors
    },
    integrity: {
      ok: integrity.ok,
      issues: integrity.issues,
      summary: {
        errorCount: integrity.errorCount,
        warningCount: integrity.warningCount
      }
    },
    providerStats: {
      pagesProcessed: combinedStats.pagesProcessed,
      totalFetched: combinedStats.totalFetched
    },
    weekly: weeklyResult
  };
}

export default {
  syncProviderActivities,
  syncProviderActivitiesWithPagination
};
