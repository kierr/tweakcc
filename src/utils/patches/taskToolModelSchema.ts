// Please see the note about writing patches in ./index.js.

import { LocationResult, showDiff } from './index.js';

/**
 * Find and return the location of the Task tool model schema
 * The schema looks like: model: _.enum(["sonnet", "opus", "haiku"])
 */
const getTaskModelSchemaLocation = (oldFile: string): LocationResult | null => {
  // Find the Task tool schema pattern
  // Looking for: model: _.enum(["sonnet", "opus", "haiku"])
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
 * Patch: Change Task tool schema to accept any string instead of hardcoded enum
 *
 * This allows users to specify custom models (like "grok-code", "gpt-4o", etc.)
 * in the Task tool parameters. The model resolution happens later in the code
 * via the existing dynamic model loading logic from the Anthropic API.
 *
 * Before: model: _.enum(["sonnet", "opus", "haiku"])
 * After:  model: _.string()
 */
export const writeTaskToolModelSchemaCustomization = (oldFile: string): string | null => {
  const location = getTaskModelSchemaLocation(oldFile);
  if (!location) {
    return null;
  }

  // Change from hardcoded enum to accepting any string
  // This delegates validation to the existing model resolution logic
  const newCode = 'model: _.string()';
  const newFile =
    oldFile.slice(0, location.startIndex) +
    newCode +
    oldFile.slice(location.endIndex);

  showDiff(oldFile, newFile, newCode, location.startIndex, location.endIndex);
  return newFile;
};
