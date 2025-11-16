import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { SelectInput, SelectItem } from './SelectInput.js';

describe('SelectInput component', () => {
  const mockItems: SelectItem[] = [
    { name: 'Option 1', desc: 'First option' },
    { name: 'Option 2', desc: 'Second option' },
    { name: 'Option 3', desc: 'Third option' },
  ];

  const mockOnSelect = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all items', () => {
    const { lastFrame } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(lastFrame()).toContain('Option 1');
    expect(lastFrame()).toContain('Option 2');
    expect(lastFrame()).toContain('Option 3');
  });

  it('should highlight the selected item with arrow', () => {
    const { lastFrame } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={1}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    const output = lastFrame();
    expect(output).toContain('❯ Option 2');
    expect(output).toContain('  Option 1'); // Non-selected should have spaces
    expect(output).toContain('  Option 3');
  });

  it('should show description for selected item', () => {
    const { lastFrame } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(lastFrame()).toContain('First option');
  });

  it('should apply custom styles to selected item', () => {
    const itemsWithStyles: SelectItem[] = [
      {
        name: 'Styled Option',
        desc: 'Has custom styles',
        selectedStyles: { color: 'green' },
      },
    ];

    const { lastFrame } = render(
      <SelectInput
        items={itemsWithStyles}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(lastFrame()).toContain('Styled Option');
  });

  it('should handle empty items array', () => {
    const { lastFrame } = render(
      <SelectInput
        items={[]}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(lastFrame()).not.toContain('❯');
  });

  it('should maintain selection state', () => {
    const { lastFrame } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={1}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(lastFrame()).toContain('❯ Option 2');
  });

  it('should handle different selected indices', () => {
    const { lastFrame: frame0 } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    const { lastFrame: frame2 } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={2}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(frame0()).toContain('❯ Option 1');
    expect(frame2()).toContain('❯ Option 3');
  });

  it('should render item names and descriptions', () => {
    const { lastFrame } = render(
      <SelectInput
        items={mockItems}
        selectedIndex={1}
        onSelect={mockOnSelect}
        onSubmit={mockOnSubmit}
      />
    );

    expect(lastFrame()).toContain('Second option');
  });

  describe('Enhanced features', () => {
    const longItemsList = Array.from({ length: 20 }, (_, i) => ({
      name: `Option ${i + 1}`,
      desc: `Description for option ${i + 1}`,
    }));

    it('should show keyboard hints by default', () => {
      const { lastFrame } = render(
        <SelectInput
          items={mockItems}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
        />
      );

      expect(lastFrame()).toContain('↑↓ Navigate • Enter Select • Esc Cancel');
    });

    it('should hide keyboard hints when disabled', () => {
      const { lastFrame } = render(
        <SelectInput
          items={mockItems}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
          showKeyboardHints={false}
        />
      );

      expect(lastFrame()).not.toContain('↑↓ Navigate • Enter Select • Esc Cancel');
    });

    it('should show scroll indicators for long lists', () => {
      const { lastFrame } = render(
        <SelectInput
          items={longItemsList}
          selectedIndex={5}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
          maxHeight={8}
        />
      );

      // Should show top indicator when not at the beginning
      expect(lastFrame()).toContain('▲ More items above');
    });

    it('should show bottom scroll indicator when not at end', () => {
      const { lastFrame } = render(
        <SelectInput
          items={longItemsList}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
          maxHeight={5}
        />
      );

      expect(lastFrame()).toContain('▼ More items below');
    });

    it('should not show scroll indicators for short lists', () => {
      const { lastFrame } = render(
        <SelectInput
          items={mockItems}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
          maxHeight={10}
        />
      );

      expect(lastFrame()).not.toContain('▲ More items above');
      expect(lastFrame()).not.toContain('▼ More items below');
    });

    it('should handle empty arrays with keyboard hints disabled', () => {
      const { lastFrame } = render(
        <SelectInput
          items={[]}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
          showKeyboardHints={true}
        />
      );

      expect(lastFrame()).not.toContain('↑↓ Navigate • Enter Select • Esc Cancel');
    });

    it('should respect custom maxHeight', () => {
      const { lastFrame } = render(
        <SelectInput
          items={mockItems}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
          maxHeight={2}
        />
      );

      const output = lastFrame();
      // Should show appropriate scroll indicators due to small max height
      expect(output).toContain('▼ More items below');
    });

    it('should maintain visual highlighting for selected item', () => {
      const { lastFrame } = render(
        <SelectInput
          items={mockItems}
          selectedIndex={1}
          onSelect={mockOnSelect}
          onSubmit={mockOnSubmit}
        />
      );

      const output = lastFrame();
      // Should show highlighted selection
      expect(output).toContain('❯ Option 2');
      // Should show description for selected item
      expect(output).toContain('— Second option');
    });
  });
});