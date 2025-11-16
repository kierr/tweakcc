// System theme detection for Claude Code patcher
// Detects system light/dark mode across platforms

import { execSync } from 'child_process';

const detectMacOsTheme = () => {
  try {
    const result = execSync(
      'defaults read -g AppleInterfaceStyle 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();
    return result === 'Dark' ? 'dark' : 'light';
  } catch {
    // Command fails if Light mode (Dark mode not set)
    return 'light';
  }
};

const detectWindowsTheme = () => {
  try {
    // Try Windows Registry first (Windows 10+)
    const result = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme 2>nul',
      { encoding: 'utf8' }
    );

    // AppsUseLightTheme: 0 = Dark mode, 1 = Light mode
    const match = result.match(/AppsUseLightTheme\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
    if (match) {
      const value = parseInt(match[1], 16);
      return value === 0 ? 'dark' : 'light';
    }
    return 'light';
  } catch {
    // Fallback or older Windows versions
    return 'light';
  }
};

const detectLinuxTheme = () => {
  try {
    // Try GTK theme detection
    const result = execSync(
      'gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null || gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    if (result.includes('dark') || result.includes('Dark')) {
      return 'dark';
    }
    return 'light';
  } catch {
    // Fallback: try to detect from environment
    try {
      const gtkTheme = process.env.GTK_THEME || '';

      if (gtkTheme.toLowerCase().includes('dark')) {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  }
};

/**
 * Detect the current system theme
 * @returns {'dark' | 'light'} The detected theme
 */
const detectSystemTheme = () => {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return detectMacOsTheme();
    case 'win32':
      return detectWindowsTheme();
    case 'linux':
      return detectLinuxTheme();
    default:
      return 'light';
  }
};

module.exports = {
  detectSystemTheme,
  detectMacOsTheme,
  detectWindowsTheme,
  detectLinuxTheme,
};
