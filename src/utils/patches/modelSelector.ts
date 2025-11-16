// Please see the note about writing patches in ./index.js.

import { showDiff } from './index.js';

// Note: The static CUSTOM_MODELS list has been replaced with dynamic fetching.
// Models are now loaded from /v1/models API at runtime instead of being hardcoded.
// Keeping this array empty maintains backward compatibility with existing patch functions.
// prettier-ignore
export const CUSTOM_MODELS: { label: string; slug: string; internal: string }[] = [];

// Note: The getModelSelectorInsertionPoint function has been removed
// as we now use a global approach that doesn't require injecting into
// React component state

// 1) Inject one-time model fetching code at the end of the file (before S6I())
const writeDynamicModelFetcher = (oldFile: string): string | null => {
  // Find the S6I() call at the end of the file
  const s6iCall = oldFile.indexOf('S6I();');
  if (s6iCall === -1) {
    console.error('patch: writeDynamicModelFetcher: failed to find S6I() call');
    return null;
  }

  const inject = `
// ========================================
// Dynamic Model Fetching - One-time on launch
// ========================================
if (!global.claude_models_hardcoded) {
  global.claude_models_hardcoded = null;

  (async () => {
    try {
      // Check for API key in both common environment variable names
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
      if (process.env.DEBUG) console.log('[MODEL-FETCH] API key found:', apiKey ? 'YES' : 'NO');
      if (!apiKey) {
        if (process.env.DEBUG) console.log('[MODEL-FETCH] No API key - /model will show minimal options');
        return;
      }

      const baseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
      const modelsUrl = baseURL + '/v1/models?beta=true';
      const headers = {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'anthropic-beta': 'models-2023-06-01'
      };

      if (process.env.DEBUG) console.log('[MODEL-FETCH] Making API call to:', modelsUrl);
      const response = await DB.get(modelsUrl, { headers });
      if (process.env.DEBUG) console.log('[MODEL-FETCH] API response received');

      const models = response.data?.data || response.data || [];
      if (process.env.DEBUG) console.log('[MODEL-FETCH] Models count:', models.length);

      if (models.length > 0) {
        const modelOptions = [];
        const seenModelIds = new Set();  // Deduplicate by model ID

        models.forEach((model) => {
          const modelId = model.id;

          // Create prettier display name
          let displayName = model.display_name || modelId;

          // Clean up the display name
          displayName = displayName
            .replace(/^chutes,/i, 'Chutes - ')   // Convert "chutes," to "Chutes - "
            .replace(/^minimax-anthropic,/i, 'MiniMax Anthropic - ')  // Convert prefix
            .replace(/\b([a-z])/g, (m, p1) => p1.toUpperCase())  // Title case lowercase letters
            .replace('Ai', 'AI')  // Fix common acronym
            .replace(/\s+/g, ' ')            // Clean up multiple spaces
            .trim();

          // Deduplicate by canonical model name (after cleaning)
          if (seenModelIds.has(displayName)) {
            if (process.env.DEBUG) console.log('[MODEL-FETCH] Skipping duplicate display name:', displayName);
            return;
          }
          seenModelIds.add(displayName);

          modelOptions.push({
            value: modelId,
            label: displayName,
            description: 'Model ID: ' + modelId
          });
        });

        // Sort with Opus priority, then alphabetically
        modelOptions.sort((a, b) => {
          const priority = { 'opus': 0, 'sonnet': 1, 'haiku': 2 };
          const aType = Object.keys(priority).find(t => a.label.toLowerCase().includes(t)) || 99;
          const bType = Object.keys(priority).find(t => b.label.toLowerCase().includes(t)) || 99;

          // First, sort by priority (opus > sonnet > haiku)
          if (priority[aType] !== priority[bType]) {
            return priority[aType] - priority[bType];
          }

          // Then alphabetically within same priority
          return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        });

        // Add default option at the beginning
        modelOptions.unshift({
          value: null,
          label: "Default (recommended)",
          description: "Use the default model"
        });

        global.claude_models_hardcoded = modelOptions;
        if (process.env.DEBUG) console.log('[MODEL-FETCH] Loaded ' + models.length + ' models from API (one-time on launch)');
      }
    } catch (error) {
      if (process.env.DEBUG) console.log('[MODEL-FETCH] API call failed:', error.message);
    }
  })();
}

`;

  const newFile =
    oldFile.slice(0, s6iCall) + inject + oldFile.slice(s6iCall);
  showDiff(oldFile, newFile, inject, s6iCall, s6iCall);
  return newFile;
};

// 2) Add fallback logic to ht4() function to check global models first
const writeHt4Fallback = (oldFile: string): string | null => {
  // Find the ht4() function definition
  const ht4Match = oldFile.match(/function ht4\(\)\s*\{/);
  if (!ht4Match || ht4Match.index === undefined) {
    console.error('patch: writeHt4Fallback: failed to find ht4() function');
    return null;
  }

  const functionStart = ht4Match.index;
  const braceIndex = functionStart + ht4Match[0].length - 1; // position of opening brace

  const inject = `
  // Return models from one-time fetch if available
  if (global.claude_models_hardcoded) {
    return global.claude_models_hardcoded;
  }

  // Otherwise use original hardcoded logic
`;

  const newFile =
    oldFile.slice(0, braceIndex + 1) + inject + oldFile.slice(braceIndex + 1);
  showDiff(oldFile, newFile, inject, braceIndex + 1, braceIndex + 1);
  return newFile;
};

// 3) Increase the visible model list limit from 10 to 100
const writeVisibleLimitPatch = (oldFile: string): string | null => {
  // Find the line with "F = 10," and replace it
  const fLineMatch = oldFile.match(/F\s*=\s*10,/);
  if (!fLineMatch || fLineMatch.index === undefined) {
    console.error('patch: writeVisibleLimitPatch: failed to find F = 10 line');
    return null;
  }

  const updatedLine = 'F = 100,';
  const newFile =
    oldFile.slice(0, fLineMatch.index) +
    updatedLine +
    oldFile.slice(fLineMatch.index + fLineMatch[0].length);
  showDiff(oldFile, newFile, updatedLine, fLineMatch.index, fLineMatch.index + updatedLine.length);
  return newFile;
};


// 2) Extend the known model names list (sB2=[...]) to include our lowercased friendly names
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const writeKnownModelNames = (oldFile: string): string | null => {
  const m = oldFile.match(/"sonnet\[1m\]"/);
  if (!m || m.index === undefined) {
    console.error(
      'patch: writeKnownModelNames: failed to find sonnet[1m] marker'
    );
    return null;
  }
  const markerIdx = m.index;

  // Find '[' belonging to the array definition (e.g., sB2=[ ... ])
  let start = markerIdx;
  while (start >= 0 && oldFile[start] !== '[') {
    start--;
  }
  if (start < 0) {
    console.error('patch: writeKnownModelNames: failed to find array start');
    return null;
  }
  // Ensure previous non-space char before '[' is '=' (assignment)
  let p = start - 1;
  while (p >= 0 && /\s/.test(oldFile[p])) {
    p--;
  }
  if (p < 0 || oldFile[p] !== '=') {
    console.error('patch: writeKnownModelNames: failed to find assignment');
    return null;
  }

  // Find matching closing ']'
  let end = start;
  let depth = 0;
  let foundEnd = -1;
  while (end < oldFile.length) {
    const ch = oldFile[end];
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        foundEnd = end;
        break;
      }
    }
    end++;
  }
  if (foundEnd === -1) {
    console.error('patch: writeKnownModelNames: failed to find array end');
    return null;
  }

  const arrayText = oldFile.slice(start, foundEnd + 1);
  let arr: string[];
  try {
    arr = JSON.parse(arrayText);
  } catch {
    console.error('patch: writeKnownModelNames: failed to parse array');
    return null;
  }

  const toAdd = CUSTOM_MODELS.map(m => m.slug);
  const set = new Set(arr);
  for (const name of toAdd) {
    set.add(name);
  }
  const updated = JSON.stringify(Array.from(set));

  const newFile =
    oldFile.slice(0, start) + updated + oldFile.slice(foundEnd + 1);
  showDiff(oldFile, newFile, updated, start, foundEnd + 1);
  return newFile;
};

// 3) Append new cases to the switch that maps friendly names -> internal IDs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const writeModelSwitchMapping = (oldFile: string): string | null => {
  const caseAnchor = 'case"sonnet[1m]"';
  const caseIdx = oldFile.indexOf(caseAnchor);
  if (caseIdx === -1) {
    console.error('patch: writeModelSwitchMapping: failed to find caseAnchor');
    return null;
  }

  // Find the opening '{' for the switch block by scanning backward
  let open = caseIdx;
  while (open >= 0 && oldFile[open] !== '{') {
    open--;
  }
  if (open < 0) {
    console.error('patch: writeModelSwitchMapping: failed to find switch open');
    return null;
  }

  // Find the closing '}' for the switch block by scanning forward
  let close = caseIdx;
  while (close < oldFile.length && oldFile[close] !== '}') {
    close++;
  }
  if (close >= oldFile.length) {
    console.error(
      'patch: writeModelSwitchMapping: failed to find switch close'
    );
    return null;
  }

  const oldSwitch = oldFile.slice(open, close + 1);
  const appended = CUSTOM_MODELS.map(
    m => `case${JSON.stringify(m.slug)}:return${JSON.stringify(m.internal)};`
  ).join('');
  const beforeClose = oldSwitch.slice(0, -1);
  const endsWithSemicolon = /;\s*$/.test(beforeClose);
  const injected = (endsWithSemicolon ? '' : ';') + appended;
  const newSwitch = beforeClose + injected + '}';

  const newFile = oldFile.slice(0, open) + newSwitch + oldFile.slice(close + 1);
  showDiff(
    oldFile,
    newFile,
    appended,
    open + oldSwitch.length - 1,
    open + oldSwitch.length - 1
  );
  return newFile;
};

// One-shot helper to apply all model-related customizations
export const writeModelCustomizations = (oldFile: string): string | null => {
  let updated: string | null = oldFile;

  // const a = writeKnownModelNames(updated);
  // if (a) updated = a;

  // const b = writeModelSwitchMapping(updated);
  // if (b) updated = b;

  // 1) Inject one-time model fetching code at the end of the file
  const c = writeDynamicModelFetcher(updated);
  if (c) updated = c;

  // 2) Add fallback logic to ht4() function
  const d = writeHt4Fallback(updated);
  if (d) updated = d;

  // 3) Increase visible model list limit from 10 to 100
  const e = writeVisibleLimitPatch(updated);
  if (e) updated = e;

  return updated === oldFile ? null : updated;
};
