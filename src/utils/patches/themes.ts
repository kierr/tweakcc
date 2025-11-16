// Please see the note about writing patches in ./index.js.

import { Theme } from '../types.js';
import { LocationResult, showDiff } from './index.js';

function getThemesLocation(oldFile: string): {
  switchStatement: LocationResult;
  objArr: LocationResult;
  obj: LocationResult;
} | null {
  // Look for switch statement pattern: switch(A){case"light":return ...;}
  const switchPattern =
    /switch\s*\(([^)]+)\)\s*\{[^}]*case\s*["']light["'][^}]+\}/s;
  const switchMatch = oldFile.match(switchPattern);

  if (!switchMatch || switchMatch.index == undefined) {
    console.error('patch: themes: failed to find switchMatch');
    return null;
  }

  const objArrPat = /\[(?:\{label:"(?:Dark|Light).+?",value:".+?"\},?)+\]/;
  const objPat = /return\{(?:[$\w]+?:"(?:Dark|Light).+?",?)+\}/;
  const objArrMatch = oldFile.match(objArrPat);
  const objMatch = oldFile.match(objPat);

  if (!objArrMatch || objArrMatch.index == undefined) {
    console.error('patch: themes: failed to find objArrMatch');
    return null;
  }

  if (!objMatch || objMatch.index == undefined) {
    console.error('patch: themes: failed to find objMatch');
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
 * Get the function name that provides theme colors
 */
const getColorsFunctionName = (oldFile: string): string | null => {
  // Look for function like: function JS0(A){switch(A){case"light":return{...}}}
  const pattern = /function ([$\w]+)\(A\)\{switch\(A\)\{case"light":return\{/;
  const match = oldFile.match(pattern);
  if (!match) {
    console.error('patch: themes: could not find theme colors function name');
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
    return null;
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
