import { Box, Text, Spacer } from 'ink';
import Link from 'ink-link';
import { SelectInput, SelectItem } from './SelectInput.js';
import { useContext, useState, useMemo } from 'react';
import React from 'react';
import { SettingsContext } from '../App.js';
import { CONFIG_FILE, MainMenuItem, StartupCheckInfo } from '../utils/types.js';

export interface MainViewProps {
  onSubmit: (item: MainMenuItem) => void;
  notification: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
  startupCheckInfo: StartupCheckInfo;
}

// Status bar component to display Claude Code installation information
const StatusBar = React.memo(({ startupCheckInfo }: { startupCheckInfo: StartupCheckInfo }) => {
  const { ccInstInfo } = startupCheckInfo;
  const isNative = !!ccInstInfo.nativeInstallationPath;
  const binaryPath = isNative ? ccInstInfo.nativeInstallationPath : ccInstInfo.cliPath;

  // Display full path without truncation
  const displayPath = binaryPath || 'Unknown';

  return (
    <Box
      borderStyle="single"
      borderColor="brightMagenta"
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      <Box justifyContent="space-between" width="100%">
        <Box>
          <Text color="green" bold>✓</Text>
          <Text bold color="brightYellow"> Claude Code </Text>
          <Text bold color="brightCyan">{ccInstInfo.version || 'Unknown'}</Text>
        </Box>

        <Box>
          <Text color="brightMagenta">|</Text>
          <Spacer />
          <Text bold color="brightYellow">
            {isNative ? (
              <>
                <Text color="yellow">📦</Text>
                <Text> Native</Text>
              </>
            ) : (
              <>
                <Text color="blue">📋</Text>
                <Text> NPM</Text>
              </>
            )}
          </Text>
          <Spacer />
          <Text color="brightMagenta">|</Text>
          <Spacer />
          <Text bold color="brightYellow">
            {displayPath}
          </Text>
        </Box>
      </Box>
    </Box>
  );
});

// prettier-ignore
const baseMenuItems: SelectItem[] = [
  {
    name: MainMenuItem.THEMES,
    desc: "Modify Claude Code's built-in themes or create your own",
  },
  {
    name: MainMenuItem.THINKING_VERBS,
    desc: "Customize the list of verbs that Claude Code uses when it's working",
  },
  {
    name: MainMenuItem.THINKING_STYLE,
    desc: 'Choose custom spinners',
  },
  {
    name: MainMenuItem.USER_MESSAGE_DISPLAY,
    desc: 'Customize how user messages are displayed',
  },
  {
    name: MainMenuItem.MISC,
    desc: 'Miscellaneous settings (input box border, etc.)',
  },
  {
    name: MainMenuItem.TOOLSETS,
    desc: 'Manage toolsets to control which tools are available',
  },
  {
    name: MainMenuItem.VIEW_SYSTEM_PROMPTS,
    desc: 'Opens the system prompts directory where you can customize Claude Code\'s system prompts',
  },
];

// prettier-ignore
const systemMenuItems: SelectItem[] = [
  {
    name: MainMenuItem.RESTORE_ORIGINAL,
    desc: 'Reverts your Claude Code install to its original state (your customizations are remembered and can be reapplied)',
  },
  {
    name: MainMenuItem.OPEN_CONFIG,
    desc: `Opens your tweakcc config file (${CONFIG_FILE})`,
  },
  {
    name: MainMenuItem.OPEN_CLI,
    desc: "Opens Claude Code's cli.js file",
  },
  {
    name: MainMenuItem.EXIT,
    desc: 'Bye!',
  },
];

const MainView = React.memo(({
  onSubmit,
  notification,
  startupCheckInfo,
}: MainViewProps) => {
  const isNativeInstallation = useMemo(() =>
    !!startupCheckInfo.ccInstInfo.nativeInstallationPath,
    [startupCheckInfo.ccInstInfo.nativeInstallationPath]
  );

  const filteredSystemMenuItems = useMemo(() =>
    isNativeInstallation
      ? systemMenuItems.filter(item => item.name !== MainMenuItem.OPEN_CLI)
      : systemMenuItems,
    [isNativeInstallation]
  );

  const { changesApplied } = useContext(SettingsContext);

  const menuItems = useMemo(() => [
    ...(changesApplied
      ? []
      : [
          {
            name: MainMenuItem.APPLY_CHANGES,
            desc: 'Required: Updates Claude Code in-place with your changes',
            selectedStyles: {
              color: 'green',
            },
          },
        ]),
    ...baseMenuItems,
    ...filteredSystemMenuItems,
  ], [changesApplied, filteredSystemMenuItems]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Box
          borderStyle="round"
          borderColor="#ffd500"
          paddingX={2}
          paddingY={1}
          marginBottom={1}
        >
          <Text bold color="#ffd500">
            Tweak Claude Code
          </Text>
        </Box>
      </Box>

      {/* Status Bar */}
      <StatusBar startupCheckInfo={startupCheckInfo} />

      {/* Description */}
      <Box marginBottom={1}>
        <Text bold color="brightYellow">
          <Text bold color="brightGreen">Customize your Claude Code installation.</Text>{' '}
          <Text bold color="brightCyan">Settings will be saved to a JSON file.</Text>
        </Text>
      </Box>

      {/* GitHub Stars */}
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          ⭐ <Text bold>Star the repo at </Text>
          <Link url="https://github.com/Piebald-AI/tweakcc" fallback={false}>
            <Text bold color="brightCyan">
              https://github.com/Piebald-AI/tweakcc
            </Text>
          </Link>
          <Text bold> if you find this useful!</Text> ⭐
        </Text>
      </Box>

      {/* Notification */}
      {notification && (
        <Box
          marginBottom={1}
          borderStyle="single"
          borderColor={
            notification?.type === 'success'
              ? 'green'
              : notification?.type === 'error'
                ? 'red'
                : notification?.type === 'info'
                  ? 'blue'
                  : 'yellow'
          }
          paddingX={1}
          paddingY={1}
        >
          <Box flexDirection="row" alignItems="center">
            <Box marginRight={1}>
              {notification?.type === 'success' && (
                <Text color="green" bold>✓</Text>
              )}
              {notification?.type === 'error' && (
                <Text color="red" bold>✗</Text>
              )}
              {notification?.type === 'info' && (
                <Text color="blue" bold>ℹ</Text>
              )}
              {notification?.type === 'warning' && (
                <Text color="yellow" bold>⚠</Text>
              )}
            </Box>
            <Text
              color={
                notification?.type === 'success'
                  ? 'green'
                  : notification?.type === 'error'
                    ? 'red'
                    : notification?.type === 'info'
                      ? 'blue'
                      : 'yellow'
              }
            >
              {notification?.message}
            </Text>
          </Box>
        </Box>
      )}

      {/* Main Menu */}
      <Box
        borderStyle="single"
        borderColor="brightMagenta"
        paddingX={2}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text bold color="brightGreen">
            Main Menu
          </Text>
        </Box>
        <SelectInput
          items={menuItems}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onSubmit={item => onSubmit(item as MainMenuItem)}
        />
      </Box>
    </Box>
  );
});

StatusBar.displayName = 'StatusBar';
MainView.displayName = 'MainView';

export { MainView };
