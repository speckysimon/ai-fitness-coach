/**
 * Provider Registry
 * 
 * Central registry for all activity data providers.
 * Providers must conform to the interface defined in PROVIDER_INTERFACE.md
 */

const providers = new Map();

/**
 * Register a provider
 * 
 * @param {string} providerId - Unique provider ID (e.g., 'garmin', 'wahoo')
 * @param {Object} providerModule - Provider module with required exports
 * @throws {Error} If provider doesn't meet interface requirements
 */
export function registerProvider(providerId, providerModule) {
  // Validate required exports
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
  
  const allRequired = [...requiredServiceFunctions, ...requiredMapperFunctions];
  
  for (const fnName of allRequired) {
    if (typeof providerModule[fnName] !== 'function') {
      throw new Error(
        `Provider '${providerId}' missing required function: ${fnName}`
      );
    }
  }
  
  // Store provider
  providers.set(providerId, {
    id: providerId,
    module: providerModule,
    registeredAt: new Date().toISOString()
  });
  
  console.log(`[ProviderRegistry] Registered provider: ${providerId}`);
}

/**
 * Get a registered provider
 * 
 * @param {string} providerId - Provider ID
 * @returns {Object} Provider module
 * @throws {Error} If provider not found
 */
export function getProvider(providerId) {
  const provider = providers.get(providerId);
  
  if (!provider) {
    throw new Error(`Provider '${providerId}' not registered`);
  }
  
  return provider.module;
}

/**
 * Check if provider is registered
 * 
 * @param {string} providerId - Provider ID
 * @returns {boolean} True if registered
 */
export function hasProvider(providerId) {
  return providers.has(providerId);
}

/**
 * List all registered providers
 * 
 * @returns {Array<Object>} List of provider info
 */
export function listProviders() {
  return Array.from(providers.values()).map(p => ({
    id: p.id,
    registeredAt: p.registeredAt
  }));
}

/**
 * Unregister a provider (for testing)
 * 
 * @param {string} providerId - Provider ID
 */
export function unregisterProvider(providerId) {
  providers.delete(providerId);
  console.log(`[ProviderRegistry] Unregistered provider: ${providerId}`);
}

/**
 * Clear all providers (for testing)
 */
export function clearProviders() {
  providers.clear();
  console.log(`[ProviderRegistry] Cleared all providers`);
}

export default {
  registerProvider,
  getProvider,
  hasProvider,
  listProviders,
  unregisterProvider,
  clearProviders
};
