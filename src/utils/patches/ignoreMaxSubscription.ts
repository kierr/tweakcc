// Please see the note about writing patches in ./index.ts.

import { LocationResult, showDiff } from './index.js';

// This patch forces the "/cost" ccommand to always show the cost by disabling the
// subscription gating check.  In minified code it looks like:
//   async call(){if(t2())return{type:"text",value:`With your ${aP1()} subscription, no need to monitor cost ...`};return{...}}
// We rewrite `if(t2())` to `if(!1)` for that specific branch, so it will never execute, and
// instead the detailed path will be taken.

const getIgnoreMaxSubscriptionLocation = (
  oldFile: string
): LocationResult | null => {
  // 1) Find subscription-related phrases with multiple fallbacks
  const subscriptionPhrases = [
    'subscription, no need to monitor cost',
    'subscription, no need to monitor costs',
    'with your subscription',
    'subscription plan',
    'premium subscription',
    'pro subscription',
    'max subscription'
  ];

  let phraseIdx = -1;
  let foundPhrase = '';

  for (const phrase of subscriptionPhrases) {
    phraseIdx = oldFile.indexOf(phrase);
    if (phraseIdx !== -1) {
      foundPhrase = phrase;
      console.log(`patch: ignoreMaxSubscription: found phrase "${foundPhrase}"`);
      break;
    }
  }

  if (phraseIdx === -1) {
    // Fallback: Look for broader cost/subscription related patterns
    const costPatterns = [
      /subscription.*cost/i,
      /cost.*subscription/i,
      /monitor.*cost/i,
      /need.*monitor.*cost/i
    ];

    for (const pattern of costPatterns) {
      const match = oldFile.match(pattern);
      if (match && match.index !== undefined) {
        phraseIdx = match.index;
        foundPhrase = match[0];
        console.log(`patch: ignoreMaxSubscription: using pattern fallback "${foundPhrase}"`);
        break;
      }
    }
  }

  if (phraseIdx === -1) {
    console.error('patch: ignoreMaxSubscription: no subscription-related phrase found');
    return null;
  }

  // 2) Look back 100 chars and search for `if([$\w]+\(\))` or similar patterns
  const windowStart = Math.max(0, phraseIdx - 100);
  const windowEnd = phraseIdx;
  const window = oldFile.slice(windowStart, windowEnd);

  // Try multiple if statement patterns
  const ifPatterns = [
    /if\(([$\w]+)\(\)\)/g,
    /if\s*\(\s*([$\w]+)\(\)\s*\)/g,
    /if\s*\(\s*!([$\w]+)\(\)\s*\)/g,
    /if\(([$\w]+)\([^)]*\)\)/g  // In case it has parameters
  ];

  let last: RegExpMatchArray | null = null;
  for (const pattern of ifPatterns) {
    for (const m of window.matchAll(pattern)) {
      last = m;
    }
    if (last) break;
  }

  if (!last || last.index === undefined) {
    console.error(
      'patch: ignoreMaxSubscription: could not match any if statement pattern nearby'
    );
    return null;
  }

  // 3) Return the location of the whole `if(...)` to replace with `if(!1)`.
  const startIndex = windowStart + last.index;
  const endIndex = startIndex + last[0].length;
  return { startIndex, endIndex };
};

export const writeIgnoreMaxSubscription = (oldFile: string): string | null => {
  const location = getIgnoreMaxSubscriptionLocation(oldFile);
  if (!location) {
    return null;
  }

  const newContent = 'if(!1)';
  const newFile =
    oldFile.slice(0, location.startIndex) +
    newContent +
    oldFile.slice(location.endIndex);
  showDiff(
    oldFile,
    newFile,
    newContent,
    location.startIndex,
    location.endIndex
  );
  return newFile;
};
