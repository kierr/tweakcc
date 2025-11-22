// Please see the note about writing patches in ./index.js.

import { Theme } from '../types.js';
import { LocationResult, showDiff } from './index.js';

function getThemesLocation(oldFile: string): {
  switchStatement: LocationResult;
  objArr: LocationResult;
  obj: LocationResult;
} | null {
  // Look for switch statement pattern with multiple fallbacks
  let switchMatch = oldFile.match(/switch\s*\(([^)]+)\)\s*\{[^}]*case\s*["']light["'][^}]+\}/s);

  if (!switchMatch || switchMatch.index == undefined) {
    // Fallback 1: Look for switch with theme-like cases
    const themeCases = ['light', 'dark', 'auto', 'theme'];
    for (const theme of themeCases) {
      const pattern = new RegExp(`switch\\s*\\(([^)]+)\\)\\s*\\{[^}]*case\\s*["']${theme}["'][^}]+\\}`, 's');
      switchMatch = oldFile.match(pattern);
      if (switchMatch && switchMatch.index !== undefined) {
        console.log(`patch: themes: using fallback switch pattern with theme '${theme}'`);
        break;
      }
    }
  }

  if (!switchMatch || switchMatch.index == undefined) {
    // Fallback 2: Look for any switch statement with string cases
    const genericSwitchPattern = /switch\s*\(([^)]+)\)\s*\{[^}]*case\s*["'][^"']+["'][^}]+\}/s;
    switchMatch = oldFile.match(genericSwitchPattern);
    if (switchMatch && switchMatch.index !== undefined) {
      console.log('patch: themes: using generic switch pattern');
    }
  }

  if (!switchMatch || switchMatch.index == undefined) {
    console.error('patch: themes: failed to find any switch statement');
    return null;
  }

  // Find theme options array with multiple patterns
  let objArrMatch = oldFile.match(/\[(?:\{label:"(?:Dark|Light).+?",value:".+?"\},?)+\]/);

  if (!objArrMatch || objArrMatch.index == undefined) {
    // Fallback: Look for arrays with theme-like objects
    const themeArrayPatterns = [
      /\[(?:\{label:[^}]*theme[^}]*value:[^}]+\},?)+\]/i,
      /\[(?:\{[^}]*label:[^}]*value:[^}]*\},?)+\]/,
      /\[(?:\{[^}]*"label"[^}]*"value"[^}]+\},?)+\]/
    ];

    for (const pattern of themeArrayPatterns) {
      objArrMatch = oldFile.match(pattern);
      if (objArrMatch && objArrMatch.index !== undefined) {
        console.log('patch: themes: using fallback array pattern');
        break;
      }
    }
  }

  if (!objArrMatch || objArrMatch.index == undefined) {
    console.error('patch: themes: failed to find theme options array');
    return null;
  }

  // Find theme mapping object with multiple patterns
  let objMatch = oldFile.match(/return\{(?:[$\w]+?:"(?:Dark|Light).+?",?)+\}/);

  if (!objMatch || objMatch.index == undefined) {
    // Fallback: Look for return objects with theme mappings
    const themeObjectPatterns = [
      /return\{(?:[$\w]+?:"[^"]+",?)+\}/,
      /return\{(?:[$\w]+?:[^,}]+,?)+\}/,
      /return\s*\{[^}]*theme[^}]*\}/i
    ];

    for (const pattern of themeObjectPatterns) {
      objMatch = oldFile.match(pattern);
      if (objMatch && objMatch.index !== undefined) {
        console.log('patch: themes: using fallback object pattern');
        break;
      }
    }
  }

  if (!objMatch || objMatch.index == undefined) {
    console.error('patch: themes: failed to find theme mapping object');
    return null;
  }

  return {
    switchStatement: {
      startIndex: switchMatch.index,
      endIndex: switchMatch.index + switchMatch[0].length,
      identifiers: [switchMatch[1].trim()],
    },
    objArr: {
      startIndex: objArrMatch.index,
      endIndex: objArrMatch.index + objArrMatch[0].length,
    },
    obj: {
      startIndex: objMatch.index,
      endIndex: objMatch.index + objMatch[0].length,
    },
  };
}

/**
 * Get the function name that provides theme colors with multiple fallbacks
 */
const getColorsFunctionName = (oldFile: string): string | null => {
  // Look for function like: function JS0(A){switch(A){case"light":return{...}}}
  let pattern = /function ([$\w]+)\(A\)\{switch\(A\)\{case"light":return\{/;
  let match = oldFile.match(pattern);

  if (!match) {
    // Fallback 1: Look for function with theme switch cases
    const themeCases = ['light', 'dark', 'auto', 'theme'];
    for (const theme of themeCases) {
      pattern = new RegExp(`function ([\\$\\w]+)\\([\\$\\w]*\\)\\{switch\\([^}]*case["']${theme}["']:return\\{`);
      match = oldFile.match(pattern);
      if (match) {
        console.log(`patch: themes: using fallback colors function pattern with theme '${theme}'`);
        break;
      }
    }
  }

  if (!match) {
    // Fallback 2: Look for any function with switch and return object
    pattern = /function ([$\w]+)\([$\w]*\)\{switch\([^}]*case[^}]*return\{/;
    match = oldFile.match(pattern);
    if (match) {
      console.log('patch: themes: using generic colors function pattern');
    }
  }

  if (!match) {
    // Fallback 3: Look for arrow functions or const assignments with switch
    const arrowPatterns = [
      /(?:const|let|var)\s+([$\w]+)\s*=\s*\([$\w]*\)\s*=>\s*\{[^}]*switch/,
      /(?:const|let|var)\s+([$\w]+)\s*=\s*function\s*\([$\w]*\)\s*\{[^}]*switch/
    ];

    for (const arrowPattern of arrowPatterns) {
      match = oldFile.match(arrowPattern);
      if (match) {
        console.log('patch: themes: using arrow/const function pattern');
        break;
      }
    }
  }

  if (!match) {
    console.error('patch: themes: could not find any theme colors function');
    return null;
  }

  return match[1];
};

/**
 * Generate system theme detection code to inject into cli.js
 */
const generateSystemThemeDetectionCode = (): string => {
  const code = `
// System theme detection injected by tweakcc
const detectMacOsTheme = () => {
  const { execSync } = require('child_process');
  try {
    const result = execSync('defaults read -g AppleInterfaceStyle 2>/dev/null || echo Light', { encoding: 'utf8' }).trim();
    return result === 'Dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const detectWindowsTheme = () => {
  const { execSync } = require('child_process');
  try {
    const result = execSync('reg query "HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Themes\\\\Personalize" /v AppsUseLightTheme 2>nul || echo 1', { encoding: 'utf8' });
    const match = result.match(/0x([0-9a-fA-F]+)/);
    return match && parseInt(match[1], 16) === 0 ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const detectLinuxTheme = () => {
  const { execSync } = require('child_process');
  try {
    const result = execSync('gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null || gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null || echo light', { encoding: 'utf8' });
    return result.toLowerCase().includes('dark') ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const detectSystemTheme = () => {
  const platform = process.platform;
  if (platform === 'darwin') return detectMacOsTheme();
  if (platform === 'win32') return detectWindowsTheme();
  if (platform === 'linux') return detectLinuxTheme();
  return 'light';
};
`;
  return code;
};

export const writeThemes = (
  oldFile: string,
  themes: Theme[]
): string | null => {
  const locations = getThemesLocation(oldFile);
  if (!locations) {
    console.log('patch: themes: failed to find theme locations, skipping theme customization...');
    return null; // Return null to indicate no changes made, but don't break the patch chain
  }

  if (themes.length === 0) {
    return oldFile;
  }

  let newFile = oldFile;

  // Check if we have an "auto" theme
  const hasAutoTheme = themes.some(t => t.id === 'auto');

  // Process in reverse order to avoid index shifting

  // Update theme mapping object (obj)
  const obj =
    'return' +
    JSON.stringify(
      Object.fromEntries(themes.map(theme => [theme.id, theme.name]))
    );
  newFile =
    newFile.slice(0, locations.obj.startIndex) +
    obj +
    newFile.slice(locations.obj.endIndex);
  showDiff(
    oldFile,
    newFile,
    obj,
    locations.obj.startIndex,
    locations.obj.endIndex
  );
  oldFile = newFile;

  // Update theme options array (objArr)
  const objArr = JSON.stringify(
    themes.map(theme => ({ label: theme.name, value: theme.id }))
  );
  newFile =
    newFile.slice(0, locations.objArr.startIndex) +
    objArr +
    newFile.slice(locations.objArr.endIndex);
  showDiff(
    oldFile,
    newFile,
    objArr,
    locations.objArr.startIndex,
    locations.objArr.endIndex
  );
  oldFile = newFile;

  // Update switch statement with system detection support if needed
  let switchStatement: string;

  if (hasAutoTheme) {
    // Inject system detection code before the function
    const colorsFnName = getColorsFunctionName(oldFile);
    if (!colorsFnName) {
      console.error('patch: themes: could not find theme colors function');
      return null;
    }

    // Find the function and inject detection code before it
    const funcPattern = new RegExp(`(function ${colorsFnName}\\(A\\)\\{)`);
    const funcMatch = oldFile.match(funcPattern);
    if (!funcMatch || funcMatch.index === undefined) {
      console.error('patch: themes: could not find theme colors function');
      return null;
    }

    const detectionCode = generateSystemThemeDetectionCode();
    newFile =
      newFile.slice(0, funcMatch.index) +
      detectionCode +
      newFile.slice(funcMatch.index);

    // Build switch statement with auto detection
    switchStatement = `switch(${locations.switchStatement.identifiers?.[0]}){\n`;
    themes.forEach(theme => {
      if (theme.id === 'auto') {
        // Auto theme: detect system theme and return appropriate colors
        switchStatement += `case"auto":{const systemTheme=detectSystemTheme();return systemTheme==="dark"?${JSON.stringify(
          themes.find(t => t.id === 'dark')?.colors || theme.colors
        )}:${JSON.stringify(
          themes.find(t => t.id === 'light')?.colors || theme.colors
        )};}\n`;
      } else {
        switchStatement += `case"${theme.id}":return${JSON.stringify(
          theme.colors
        )};\n`;
      }
    });
    switchStatement += `default:return${JSON.stringify(themes[0].colors)};\n}`;
  } else {
    // Standard switch statement without auto detection
    switchStatement = `switch(${locations.switchStatement.identifiers?.[0]}){\n`;
    themes.forEach(theme => {
      switchStatement += `case"${theme.id}":return${JSON.stringify(
        theme.colors
      )};\n`;
    });
    switchStatement += `default:return${JSON.stringify(themes[0].colors)};\n}`;
  }

  newFile =
    newFile.slice(0, locations.switchStatement.startIndex) +
    switchStatement +
    newFile.slice(locations.switchStatement.endIndex);
  showDiff(
    oldFile,
    newFile,
    switchStatement,
    locations.switchStatement.startIndex,
    locations.switchStatement.endIndex
  );

  return newFile;
};
