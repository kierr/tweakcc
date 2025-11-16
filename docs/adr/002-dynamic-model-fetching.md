# 002. Dynamic Model Fetching for Claude Code

**Date:** 2025-01-15
**Status:** Accepted
**Deciders:** tweakcc maintainers

## Context

tweakcc is a CLI tool that customizes Claude Code by patching its CLI files or binaries. One of the customizations is adding additional Claude models to the model selector dropdown in the Claude Code UI.

Previously, the model selector patch (`src/utils/patches/modelSelector.ts`) used a hardcoded list of static models in the `CUSTOM_MODELS` array. This approach required manual updates whenever Anthropic released new models, creating maintenance overhead and ensuring the model list would become stale over time.

During analysis of Claude Code v2.0.41's CLI file, we discovered that the `cFA` class (models API client) was already present in the codebase with a functional `list()` method that fetches real models from the Anthropic API endpoint `/v1/models`. However, this existing API client infrastructure was not being utilized by the UI model selector.

## Decision

We will replace the static hardcoded model list with **dynamic model fetching** that leverages the existing `cFA` models API client infrastructure to fetch models from the Anthropic API at runtime.

## Implementation

### Changes Made

1. **Removed Static Model List**: The `CUSTOM_MODELS` array in `modelSelector.ts` is now empty, removing the hardcoded model definitions.

2. **Added Dynamic Model Fetcher**: Created new function `writeDynamicModelFetcher()` that injects code into Claude Code's CLI that:
   - Accesses the existing models API client (`cFA` class instance)
   - Calls `modelsClient.list({})` to fetch real models from `/v1/models`
   - Transforms API response to match UI format requirements
   - Sorts models by priority (Opus > Sonnet > Haiku) and version (newest first)
   - Handles errors gracefully with fallback to original options

3. **Enhanced Model Processing**: The injected code intelligently:
   - Parses model IDs like `claude-3-5-sonnet-20241022`
   - Extracts and formats model names with versions
   - Adds dates for older models when relevant
   - Filters out invalid models
   - Sorts models for optimal user experience

4. **Maintained Backward Compatibility**: Old patch functions remain in code but are commented out, ensuring the infrastructure is preserved.

### Code Changes

**File: `src/utils/patches/modelSelector.ts`**

- **Before**: Static `CUSTOM_MODELS` array with 9 hardcoded models
- **After**: Empty `CUSTOM_MODELS` array with documentation explaining the change
- **Added**: `writeDynamicModelFetcher()` function that injects runtime API fetching
- **Modified**: `writeModelCustomizations()` now calls dynamic fetcher instead of static injection

### Technical Details

The injected code pattern:

```javascript
(async () => {
  try {
    const modelsClient = this._client?.models || this._anthropic?.beta?.models;
    if (modelsClient?.list) {
      const response = await modelsClient.list({});
      const apiModels = response?.data || [];
      // Transform and sort models...
      ${optionsVar}.splice(0, ${optionsVar}.length, ...modelOptions);
    }
  } catch (error) {
    console.warn('[tweakcc] Failed to fetch models from API:', error);
    // Keep original options as fallback
  }
})();
```

## Consequences

### Benefits

- **Always Current**: Shows all models available from Anthropic API, including newly released ones
- **User-Specific**: Respects individual API key permissions and model availability
- **Maintenance-Free**: No manual updates required when Anthropic releases new models
- **Better UX**: Models are automatically sorted by relevance and recency
- **Resilient**: Graceful error handling ensures UI works even if API calls fail
- **Leverages Existing Infrastructure**: Uses the already-present `cFA` API client

### Trade-offs

- **Runtime Dependency**: Requires successful API calls during UI initialization
- **Network Dependency**: Requires network access to Anthropic's API
- **Initial Load Time**: Small additional delay while fetching model list
- **API Rate Limits**: Potential throttling if user makes frequent calls

### Risk Mitigation

- **Graceful Fallbacks**: If API fails, original static options remain visible
- **Error Logging**: API failures are logged for debugging without breaking UI
- **Network Resilience**: Uses existing authentication and error handling infrastructure

## Implementation Status

✅ **Complete**:
- Dynamic model fetching implementation in `src/utils/patches/modelSelector.ts`
- Removed static `CUSTOM_MODELS` array
- Created `writeDynamicModelFetcher()` function
- Updated `writeModelCustomizations()` orchestration
- Added comprehensive error handling and fallback logic

📋 **Next Steps**:
- Test implementation with real Claude Code installation
- Verify API client access patterns in different Claude Code versions
- Monitor error rates and fallback usage
- Consider adding user preference for static vs dynamic fetching

## Related Decisions

- ADR 001: Custom Modes Implementation (superseded static approach)
- Leverages existing Claude Code API client infrastructure (`cFA` class)
- Maintains compatibility with existing patch orchestration system

---

**References:**
- `src/utils/patches/modelSelector.ts` - Main implementation
- Claude Code v2.0.41 CLI analysis - API client discovery
- `/v1/models` endpoint documentation - API response format