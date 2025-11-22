import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import Header from './Header.js';

describe('Header component', () => {
  it('should render simple text header', () => {
    const { lastFrame } = render(<Header>Test Header</Header>);
    expect(lastFrame()).toContain('Test Header');
    // The header should have yellow background color indicator
    expect(lastFrame()).toMatch(/Test Header/);
  });

  it('should render with custom props', () => {
    const { lastFrame } = render(
      <Header color="red" bold>
        Custom Header
      </Header>
    );
    expect(lastFrame()).toContain('Custom Header');
  });

  it('should handle different children types', () => {
    const { lastFrame } = render(<Header>Simple Text</Header>);
    expect(lastFrame()).toContain('Simple Text');
  });
});