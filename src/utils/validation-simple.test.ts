import { describe, it, expect } from 'vitest';
import { validateTweakccConfig, formatValidationErrors } from './validation-simple.js';

describe('validation-simple.ts', () => {
  describe('validateTweakccConfig', () => {
    it('should accept valid config', () => {
      const validConfig = {
        ccVersion: '1.0.0',
        ccInstallationDir: '/path/to/install',
        lastModified: '2023-01-01T00:00:00.000Z',
        changesApplied: true,
        settings: {
          themes: [{
            name: 'Test Theme',
            id: 'test-theme',
            colors: {
              autoAccept: '#fff',
              bashBorder: '#fff',
              claude: '#fff',
              // Add other required colors...
              text: '#fff',
              background: '#000'
            }
          }],
          toolsets: [{
            name: 'Test Toolset',
            allowedTools: ['tool1', 'tool2']
          }],
          thinkingVerbs: {
            format: '({})',
            verbs: ['thinking', 'analyzing']
          },
          thinkingStyle: {
            reverseMirror: false,
            updateInterval: 100,
            phases: ['phase1', 'phase2']
          },
          userMessageDisplay: {
            prefix: {
              format: '[User]',
              styling: ['bold'],
              foreground_color: '#fff',
              background_color: '#000'
            },
            message: {
              format: '{message}',
              styling: [],
              foreground_color: '#fff',
              background_color: '#000'
            }
          },
          inputBox: {
            removeBorder: false
          },
          misc: {
            showTweakccVersion: true,
            showPatchesApplied: true,
            expandThinkingBlocks: false
          },
          defaultToolset: null
        }
      };

      const result = validateTweakccConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid config with missing required fields', () => {
      const invalidConfig = {
        // Missing required fields
        settings: {}
      };

      const result = validateTweakccConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('ccVersion');
      expect(errorFields).toContain('lastModified');
      expect(errorFields).toContain('changesApplied');
    });

    it('should reject config with invalid themes', () => {
      const configWithInvalidThemes = {
        ccVersion: '1.0.0',
        ccInstallationDir: null,
        lastModified: '2023-01-01T00:00:00.000Z',
        changesApplied: true,
        settings: {
          themes: [
            'not-an-object', // Invalid theme
            { name: '', id: 'test', colors: {} }, // Invalid theme with empty name
            { name: 'Valid', colors: 'not-an-object' } // Invalid theme with non-object colors
          ]
        }
      };

      const result = validateTweakccConfig(configWithInvalidThemes);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const themeErrors = result.errors.filter(e => e.field.includes('themes'));
      expect(themeErrors.length).toBeGreaterThan(0);
    });

    it('should reject config with invalid toolsets', () => {
      const configWithInvalidToolsets = {
        ccVersion: '1.0.0',
        ccInstallationDir: null,
        lastModified: '2023-01-01T00:00:00.000Z',
        changesApplied: true,
        settings: {
          toolsets: [
            'not-an-object', // Invalid toolset
            { name: '', allowedTools: ['tool1'] }, // Invalid toolset with empty name
            { name: 'Valid', allowedTools: 'invalid-format' } // Invalid allowedTools
          ]
        }
      };

      const result = validateTweakccConfig(configWithInvalidToolsets);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const toolsetErrors = result.errors.filter(e => e.field.includes('toolsets'));
      expect(toolsetErrors.length).toBeGreaterThan(0);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        { field: 'themes[0].name', message: 'Theme name is required' },
        { field: 'toolsets[0].allowedTools', message: 'Invalid format', value: 'invalid' }
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toContain('Configuration validation failed:');
      expect(formatted).toContain('  • themes[0].name: Theme name is required');
      expect(formatted).toContain('  • toolsets[0].allowedTools: Invalid format (value: "invalid")');
    });

    it('should return empty string for no errors', () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe('');
    });
  });
});