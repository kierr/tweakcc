/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  validatePrompt,
  validateStringsFile,
  formatPromptValidationResults,
} from './promptValidation.js';
import type { StringsPrompt } from './promptSync.js';

describe('promptValidation.ts', () => {
  describe('validatePrompt', () => {
    it('should accept valid prompt', () => {
      const validPrompt: StringsPrompt = {
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'A test prompt',
        version: '1.0.0',
        pieces: ['Hello ', '!'],
        identifiers: [0],
        identifierMap: { '0': 'WORLD' },
      };

      const result = validatePrompt(validPrompt);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about TODO_TOOL_OBJECT placeholders', () => {
      const promptWithTodo: StringsPrompt = {
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'A test prompt',
        version: '1.0.0',
        pieces: ['Hello ', '!'],
        identifiers: [0],
        identifierMap: { '0': 'TODO_TOOL_OBJECT' },
      };

      const result = validatePrompt(promptWithTodo);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('identifierMap');
      expect(result.warnings[0].message).toContain('TODO_TOOL_OBJECT');
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about other TODO placeholders', () => {
      const promptWithPlaceholder: StringsPrompt = {
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'A test prompt',
        version: '1.0.0',
        pieces: ['Hello ', '!'],
        identifiers: [0],
        identifierMap: { '0': 'TODO: Define this later' },
      };

      const result = validatePrompt(promptWithPlaceholder);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('TODO: Define this later');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject prompts with missing required fields', () => {
      const invalidPrompt = {
        id: '',
        name: '',
        pieces: [],
        identifiers: 'not-an-array',
        identifierMap: {},
      };

      const result = validatePrompt(invalidPrompt as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('id');
      expect(errorFields).toContain('pieces');
      expect(errorFields).toContain('identifiers');
    });

    it('should reject prompts with unmapped identifiers', () => {
      const promptWithUnmapped: StringsPrompt = {
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'A test prompt',
        version: '1.0.0',
        pieces: ['Hello ', ' and ', '!'],
        identifiers: [0, 1],
        identifierMap: { '0': 'WORLD' }, // Missing mapping for identifier 1
      };

      const result = validatePrompt(promptWithUnmapped);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('identifiers');
      expect(result.errors[0].identifier).toBe(1);
    });

    it('should reject prompts with more identifiers than pieces', () => {
      const promptWithMismatchedCounts: StringsPrompt = {
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'A test prompt',
        version: '1.0.0',
        pieces: ['Hello '], // Only 1 piece
        identifiers: [0, 1], // But 2 identifiers
        identifierMap: { '0': 'WORLD', '1': 'EVERYONE' },
      };

      const result = validatePrompt(promptWithMismatchedCounts);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('identifiers');
      expect(result.errors[0].message).toContain('More identifiers than pieces');
    });
  });

  describe('validateStringsFile', () => {
    it('should accept valid strings file', () => {
      const validStringsFile = {
        version: '1.0.0',
        prompts: [
          {
            id: 'test-prompt-1',
            name: 'Test Prompt 1',
            description: 'A test prompt',
            version: '1.0.0',
            pieces: ['Hello ', '!'],
            identifiers: [0],
            identifierMap: { '0': 'WORLD' },
          },
          {
            id: 'test-prompt-2',
            name: 'Test Prompt 2',
            description: 'Another test prompt',
            version: '1.0.0',
            pieces: ['Goodbye ', '!'],
            identifiers: [0],
            identifierMap: { '0': 'WORLD' },
          },
        ],
      };

      const result = validateStringsFile(validStringsFile);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid strings file structure', () => {
      const invalidStringsFile = {
        version: '1.0.0',
        prompts: 'not-an-array',
      };

      const result = validateStringsFile(invalidStringsFile as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('prompts');
    });

    it('should aggregate warnings and errors from multiple prompts', () => {
      const mixedStringsFile = {
        version: '1.0.0',
        prompts: [
          {
            id: 'valid-prompt',
            name: 'Valid Prompt',
            description: 'A valid prompt',
            version: '1.0.0',
            pieces: ['Hello ', '!'],
            identifiers: [0],
            identifierMap: { '0': 'WORLD' },
          },
          {
            id: 'prompt-with-todo',
            name: 'TODO Prompt',
            description: 'A prompt with TODO',
            version: '1.0.0',
            pieces: ['Hello ', '!'],
            identifiers: [0],
            identifierMap: { '0': 'TODO_TOOL_OBJECT' },
          },
          {
            id: '',
            name: '', // Missing required fields
            description: 'Invalid prompt',
            version: '1.0.0',
            pieces: ['Hello ', '!'],
            identifiers: [0],
            identifierMap: { '0': 'WORLD' },
          },
        ],
      };

      const result = validateStringsFile(mixedStringsFile);
      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1); // From TODO_TOOL_OBJECT
      expect(result.errors.length).toBeGreaterThanOrEqual(1); // From missing id/name fields
    });
  });

  describe('formatPromptValidationResults', () => {
    it('should format errors and warnings correctly', () => {
      const result = {
        isValid: false,
        warnings: [
          {
            promptId: 'test-prompt',
            promptName: 'Test Prompt',
            field: 'identifierMap',
            message: 'Found TODO_TOOL_OBJECT placeholder',
            identifier: '6',
          },
        ],
        errors: [
          {
            promptId: 'invalid-prompt',
            promptName: 'Invalid Prompt',
            field: 'name',
            message: 'Prompt name is required',
          },
        ],
      };

      const formatted = formatPromptValidationResults(result);

      const formattedText = formatted.join('\n');
      expect(formattedText).toContain('❌ Prompt Validation Errors:');
      expect(formattedText).toContain('• Invalid Prompt (invalid-prompt): Prompt name is required');
      expect(formattedText).toContain('⚠️  Prompt Validation Warnings:');
      expect(formattedText).toContain('• Test Prompt (test-prompt) [6]: Found TODO_TOOL_OBJECT placeholder');
    });

    it('should return empty array for valid results', () => {
      const validResult = {
        isValid: true,
        warnings: [],
        errors: [],
      };

      const formatted = formatPromptValidationResults(validResult);
      expect(formatted).toHaveLength(0);
    });
  });
});