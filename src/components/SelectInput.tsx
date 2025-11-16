import React, { useMemo } from 'react';
import { Box, Text, TextProps, useInput } from 'ink';

export interface SelectItem {
  name: string;
  desc?: string;
  styles?: TextProps;
  selectedStyles?: TextProps;
}

interface SelectInputProps {
  items: SelectItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSubmit: (item: string) => void;
  maxHeight?: number;
  showKeyboardHints?: boolean;
}

export function SelectInput({
  items,
  selectedIndex,
  onSelect,
  onSubmit,
  maxHeight = 10,
  showKeyboardHints = true,
}: SelectInputProps) {
  useInput((input, key) => {
    if (key.upArrow) {
      onSelect(selectedIndex > 0 ? selectedIndex - 1 : items.length - 1);
    } else if (key.downArrow) {
      onSelect(selectedIndex < items.length - 1 ? selectedIndex + 1 : 0);
    } else if (key.return) {
      onSubmit(items[selectedIndex]?.name || '');
    } else if (key.escape) {
      // Handle escape/cancel gracefully
      onSubmit('');
    }
  });

  // Calculate visible items and scroll position
  const { visibleItems, showTopIndicator, showBottomIndicator, startIndex } = useMemo(() => {
    if (items.length <= maxHeight) {
      return {
        visibleItems: items,
        showTopIndicator: false,
        showBottomIndicator: false,
        startIndex: 0,
      };
    }

    const halfHeight = Math.floor(maxHeight / 2);
    let startIndex = selectedIndex - halfHeight;
    let endIndex = startIndex + maxHeight - 1; // Reserve space for indicators

    // Adjust bounds
    if (startIndex < 0) {
      startIndex = 0;
      endIndex = Math.min(maxHeight - 1, items.length - 1);
    } else if (endIndex >= items.length) {
      endIndex = items.length - 1;
      startIndex = Math.max(0, endIndex - maxHeight + 1);
    }

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const showTopIndicator = startIndex > 0;
    const showBottomIndicator = endIndex < items.length - 1;

    return {
      visibleItems,
      showTopIndicator,
      showBottomIndicator,
      startIndex,
    };
  }, [items, selectedIndex, maxHeight]);

  return (
    <Box flexDirection="column" gap={0}>
      {/* Top scroll indicator */}
      {showTopIndicator && (
        <Box justifyContent="center">
          <Text color="brightMagenta" bold>
            ▲ More items above
          </Text>
        </Box>
      )}

      {/* List items */}
      <Box flexDirection="column">
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const isSelected = actualIndex === selectedIndex;

          return (
            <Box key={`${actualIndex}-${item.name}`} marginBottom={0}>
              <Text
                backgroundColor={isSelected ? '#1e3a5f' : undefined}
                color={isSelected ? 'brightYellow' : 'brightWhite'}
                bold={true}
                wrap="truncate"
              >
                {isSelected ? '❯ ' : '  '}
                {item.name}
                {item.desc && (
                  <Text color={isSelected ? 'brightCyan' : 'brightMagenta'} dimColor={!isSelected} bold={!isSelected}>
                    {' — '}{item.desc}
                  </Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Bottom scroll indicator */}
      {showBottomIndicator && (
        <Box justifyContent="center">
          <Text color="brightMagenta" bold>
            ▼ More items below
          </Text>
        </Box>
      )}

      {/* Keyboard hints */}
      {showKeyboardHints && items.length > 0 && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="brightGreen" bold>
            ↑↓ Navigate • Enter Select • Esc Cancel
          </Text>
        </Box>
      )}
    </Box>
  );
}
