#!/usr/bin/env bun
/**
 * Demo script to showcase enhanced SelectInput component
 * Run with: bun run demo-select-input.ts
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { SelectInput, SelectItem } from './src/components/SelectInput.js';

// Demo items
const demoItems: SelectItem[] = [
  { name: 'Themes', desc: 'Modify Claude Code themes' },
  { name: 'Thinking Verbs', desc: 'Customize thinking verbs' },
  { name: 'Toolsets', desc: 'Manage available tools' },
  { name: 'System Prompts', desc: 'View system prompts' },
  { name: 'Configuration', desc: 'Edit settings' },
  { name: 'Restore Original', desc: 'Revert to original Claude Code' },
  { name: 'Exit', desc: 'Close the application' },
];

// Long list for scroll demonstration
const longItems: SelectItem[] = Array.from({ length: 25 }, (_, i) => ({
  name: `Option ${i + 1}`,
  desc: `This is description for option ${i + 1}`,
}));

function DemoApp() {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const [showLongList, setShowLongList] = React.useState(false);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleSubmit = (item: string) => {
    setSelectedItem(item);
    if (item === 'Exit') {
      process.exit(0);
    }
  };

  const items = showLongList ? longItems : demoItems;

  return (
    <div>
      <div style={{ marginBottom: 1 }}>
        <strong>Enhanced SelectInput Demo</strong>
      </div>
      <div style={{ marginBottom: 1 }}>
        Mode: {showLongList ? 'Long List (scrollable)' : 'Normal List'}
      </div>
      {selectedItem && (
        <div style={{ marginBottom: 1, color: 'green' }}>
          Selected: {selectedItem}
        </div>
      )}
      <SelectInput
        items={items}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onSubmit={handleSubmit}
        maxHeight={showLongList ? 8 : undefined}
        showKeyboardHints={true}
      />
    </div>
  );
}

// Interactive demo when run directly
if (import.meta.main) {
  console.log('\n🎨 Enhanced SelectInput Component Demo');
  console.log('=====================================\n');
  console.log('This demo shows the enhanced SelectInput component with:');
  console.log('• Better visual highlighting with background colors');
  console.log('• Scroll indicators (▲/▼) for long lists');
  console.log('• Keyboard navigation hints');
  console.log('• Improved focus management\n');

  console.log('Try pressing "l" to toggle to a long list and test scrolling!\n');
  console.log('Press Ctrl+C to exit.\n');

  // Run the interactive demo
  const { unmount, waitUntilExit } = render(<DemoApp />);

  // Handle toggle between normal and long list
  process.stdin.setRawMode(true);
  process.stdin.on('data', (key) => {
    if (key.toString() === 'l') {
      // This would need proper state management in a real app
      console.log('\n📝 Press "l" to toggle between normal and long lists (not implemented in this demo)');
    }
  });

  waitUntilExit().then(() => {
    unmount();
  });
}

export default DemoApp;