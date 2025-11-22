// Please see the note about writing patches in ./index.ts.

import {
  writeSlashCommandDefinition as writeSlashCommandDefinitionToArray,
} from './slashCommands.js';

/**
 * Patch: Add a /hax slash command for debugging
 *
 * Similar to Chrome DevTools Console, allows inspection of:
 * - Mn array
 * - K2A array
 * - global.claude_models_hardcoded
 * - Test validation logic
 */

/**
 * Write the /hax slash command definition
 * Uses the same pattern as conversationTitle.ts slash command
 */
export const writeHaxSlashCommand = (oldFile: string): string | null => {
  console.log('[HAX] writeHaxSlashCommand called');

  // Generate the slash command definition
  const commandDef = `, {
  type: "local",
  name: "hax",
  description: "Debug console (tweakcc)",
  isEnabled: () => !0,
  isHidden: !1,
  async call(A, B, I) {
    const msg = !A ? "Specify expression: /hax Mn or /hax 2+2" : eval(A);
    return { type: "text", value: msg + "" };
  },
  userFacingName() {
    return "hax";
  },
}`;

  console.log('[HAX] calling writeSlashCommandDefinitionToArray');
  const result = writeSlashCommandDefinitionToArray(oldFile, commandDef);
  console.log('[HAX] result:', result === null ? 'NULL (no changes)' : 'SUCCESS (file modified)');
  return result;
};