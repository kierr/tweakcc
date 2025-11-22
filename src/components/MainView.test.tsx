import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { MainView } from './MainView.js';
import type { MainViewProps } from './MainView.js';
import { MainMenuItem, DEFAULT_SETTINGS, StartupCheckInfo } from '../utils/types.js';
import { SettingsContext } from '../App.js';

// Note: vi.mock not available in vitest globals, using inline mock instead
// The Link component will render as-is since it's not critical for these tests

describe('MainView component', () => {
  const mockOnSubmit = vi.fn();

  // Mock startup check info for NPM installation
  const mockNpmStartupCheckInfo: StartupCheckInfo = {
    wasUpdated: false,
    oldVersion: null,
    newVersion: null,
    ccInstInfo: {
      cliPath: '/mock/path/to/node_modules/@anthropic-ai/claude-code/cli.js',
      version: '1.0.83',
      nativeInstallationPath: undefined,
    },
  };

  // Mock startup check info for native installation
  const mockNativeStartupCheckInfo: StartupCheckInfo = {
    wasUpdated: false,
    oldVersion: null,
    newVersion: null,
    ccInstInfo: {
      version: '1.0.83',
      nativeInstallationPath: '/mock/path/to/claude-code',
    },
  };

  const defaultProps = {
    onSubmit: mockOnSubmit,
    notification: null,
    startupCheckInfo: mockNpmStartupCheckInfo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = (changesApplied: boolean, notification?: MainViewProps['notification']) => {
    return render(
      <SettingsContext.Provider
        value={{
          settings: DEFAULT_SETTINGS,
          updateSettings: vi.fn(),
          changesApplied,
          ccVersion: '',
        }}
      >
        <MainView {...defaultProps} notification={notification ?? null} />
      </SettingsContext.Provider>
    );
  };

  it('should render the main title in a bordered box', () => {
    const { lastFrame } = renderWithContext(true);

    expect(lastFrame()).toContain('Tweak Claude Code');
  });

  it('should render the description text', () => {
    const { lastFrame } = renderWithContext(true);

    expect(lastFrame()).toContain('Customize your Claude Code installation');
  });

  it('should render the GitHub star message', () => {
    const { lastFrame } = renderWithContext(true);

    expect(lastFrame()).toContain('Star the repo');
    expect(lastFrame()).toContain('https://github.com/Piebald-AI/tweakcc');
  });

  it('should render Main Menu title', () => {
    const { lastFrame } = renderWithContext(true);

    // Enhanced SelectInput may wrap the title, check for both parts
    expect(lastFrame()).toContain('Main');
    expect(lastFrame()).toContain('Menu');
  });

  it('should render all base menu items', () => {
    const { lastFrame } = renderWithContext(true);

    expect(lastFrame()).toContain(MainMenuItem.THEMES);
    expect(lastFrame()).toContain(MainMenuItem.THINKING_VERBS);
    expect(lastFrame()).toContain(MainMenuItem.THINKING_STYLE);
    expect(lastFrame()).toContain(MainMenuItem.USER_MESSAGE_DISPLAY);
    expect(lastFrame()).toContain(MainMenuItem.MISC);
    expect(lastFrame()).toContain(MainMenuItem.TOOLSETS);
    expect(lastFrame()).toContain(MainMenuItem.VIEW_SYSTEM_PROMPTS);
  });

  it('should render system menu items', () => {
    const { lastFrame } = renderWithContext(true);

    expect(lastFrame()).toContain(MainMenuItem.RESTORE_ORIGINAL);
    expect(lastFrame()).toContain(MainMenuItem.OPEN_CONFIG);
    expect(lastFrame()).toContain(MainMenuItem.OPEN_CLI);

    // With the enhanced SelectInput's default maxHeight of 10, the Exit item
    // may be scrolled out of view when there are many menu items.
    // The presence of scroll indicators confirms we have more items.
    const frame = lastFrame();
    expect(frame).toContain('▼ More items below');
  });

  it('should NOT show Apply Changes when changesApplied is true', () => {
    const { lastFrame } = renderWithContext(true);

    expect(lastFrame()).not.toContain(MainMenuItem.APPLY_CHANGES);
  });

  it('should show Apply Changes when changesApplied is false', () => {
    const { lastFrame } = renderWithContext(false);

    expect(lastFrame()).toContain(MainMenuItem.APPLY_CHANGES);
    expect(lastFrame()).toContain('Required: Updates Claude Code');
  });

  it('should filter out OPEN_CLI for native installations', () => {
    const { lastFrame } = render(
      <SettingsContext.Provider
        value={{
          settings: DEFAULT_SETTINGS,
          updateSettings: vi.fn(),
          changesApplied: true,
          ccVersion: '',
        }}
      >
        <MainView
          onSubmit={mockOnSubmit}
          notification={null}
          startupCheckInfo={mockNativeStartupCheckInfo}
        />
      </SettingsContext.Provider>
    );

    expect(lastFrame()).not.toContain(MainMenuItem.OPEN_CLI);
    // But should still show other system menu items
    expect(lastFrame()).toContain(MainMenuItem.RESTORE_ORIGINAL);
    expect(lastFrame()).toContain(MainMenuItem.OPEN_CONFIG);
    expect(lastFrame()).toContain(MainMenuItem.EXIT);
  });

  it('should display notification when provided', () => {
    const notification = {
      message: 'Test notification message',
      type: 'success' as const,
    };

    const { lastFrame } = renderWithContext(true, notification);

    expect(lastFrame()).toContain('Test notification message');
  });

  it('should render menu within a bordered container', () => {
    const { lastFrame } = renderWithContext(true);

    const output = lastFrame();
    // Check for border characters that indicate a box
    expect(output).toContain('┌');
    expect(output).toContain('│');
    expect(output).toContain('└');
  });

  it('should render description for menu items when selected', () => {
    // The first item (THEMES) is selected by default and its description should be visible
    const { lastFrame } = renderWithContext(true);

    // Only the selected item's description is shown
    expect(lastFrame()).toContain("Modify Claude Code's built-in themes");
  });

  it('should display status bar with Claude Code version and installation type', () => {
    const { lastFrame } = renderWithContext(true);

    const output = lastFrame();
    expect(output).toContain('✓');
    expect(output).toContain('Claude Code');
    expect(output).toContain('1.0.83'); // Version from mock
    expect(output).toContain('NPM'); // Installation type from mock
    expect(output).toContain('/mock/path/to/node_modules/@anthropic-ai/claude-code/cli.js'); // Full path
  });

  it('should display Native installation type for native installations', () => {
    const { lastFrame } = render(
      <SettingsContext.Provider
        value={{
          settings: DEFAULT_SETTINGS,
          updateSettings: vi.fn(),
          changesApplied: true,
          ccVersion: '',
        }}
      >
        <MainView
          onSubmit={mockOnSubmit}
          notification={null}
          startupCheckInfo={mockNativeStartupCheckInfo}
        />
      </SettingsContext.Provider>
    );

    const output = lastFrame();
    expect(output).toContain('Native');
    expect(output).not.toContain('NPM');
  });
});