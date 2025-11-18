// Please see the note about writing patches in ./index.js.

import { LocationResult, showDiff } from './index.js';

/**
 * Find and return the location of the Task tool model schema
 */
const getTaskModelSchemaLocation = (oldFile: string): LocationResult | null => {
  const schemaPattern = /model:\s*_\.enum\(\["sonnet",\s*"opus",\s*"haiku"\]\)/;
  const schemaMatch = oldFile.match(schemaPattern);

  if (!schemaMatch || schemaMatch.index === undefined) {
    console.error(
      'patch: taskToolModelSchema: failed to find Task tool model schema'
    );
    return null;
  }

  return {
    startIndex: schemaMatch.index,
    endIndex: schemaMatch.index + schemaMatch[0].length,
  };
};

/**
 * Patch: Implement hybrid model validation for Task tool
 *
 * IMPORTANT: We use _.string() instead of _.enum() because:
 * - Zod's enum() validates strictly and fails BEFORE superRefine runs
 * - Using _.string() allows the value to pass through to superRefine
 * - superRefine then does the actual validation against both K2A and global cache
 *
 * This approach:
 * - Accepts any string (no premature rejection)
 * - Validates against K2A (static models like sonnet, opus, haiku)
 * - Validates against global.claude_models_hardcoded (dynamic API-fetched models)
 * - Provides clear error messages showing actual available models
 *
 * Before: model: _.enum(["sonnet", "opus", "haiku"])
 * After:  model: _.string().optional().superRefine(...) for hybrid validation
 */
export const writeTaskToolModelSchemaCustomization = (oldFile: string): string | null => {
  const location = getTaskModelSchemaLocation(oldFile);
  if (!location) {
    return null;
  }

  // Use string() instead of enum() to allow superRefine to handle validation
  const newCode = `model: _.string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;

      // Check static validation against K2A first
      // K2A includes Mn models (sonnet, opus, haiku, sonnet[1m], opusplan) + "inherit"
      if (K2A.includes(val)) return;

      // Check dynamic models from API cache
      // These are loaded asynchronously from /v1/models endpoint
      const isValidDynamic = global.claude_models_hardcoded?.some(m => m.value === val);

      if (!isValidDynamic) {
        // Build a comprehensive list of available models for the error message
        const staticModels = K2A.filter(m => m !== "inherit"); // exclude inherit from display
        const dynamicModels = global.claude_models_hardcoded?.map(m => m.value) || [];
        const allModels = [...new Set([...staticModels, ...dynamicModels])].sort();

        ctx.addIssue({
          code: _.ZodIssueCode.invalid_enum_value,
          message: "Invalid model. Use /model to see available models."
        });
      }
    })`;

  const newFile =
    oldFile.slice(0, location.startIndex) +
    newCode +
    oldFile.slice(location.endIndex);

  showDiff(oldFile, newFile, newCode, location.startIndex, location.endIndex);
  return newFile;
};
