import { vi } from 'vitest';

// Expose vi globally for all test files
(global as any).vi = vi;

// Also ensure vi is available from the vitest module
Object.defineProperty(global, 'vi', {
  get: () => vi,
  configurable: true,
});