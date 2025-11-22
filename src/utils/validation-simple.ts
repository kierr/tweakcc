/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Basic validators
const isString = (value: any): value is string => typeof value === 'string';
const isBoolean = (value: any): value is boolean => typeof value === 'boolean';
const isArray = (value: any): value is any[] => Array.isArray(value);
const isObject = (value: any): value is object => value !== null && typeof value === 'object' && !isArray(value);

// Simple theme validation - just check basic structure
const validateThemes = (themes: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!isArray(themes)) {
    errors.push({ field: 'themes', message: 'Themes must be an array', value: themes });
    return errors;
  }

  themes.forEach((theme: any, index: number) => {
    if (!isObject(theme)) {
      errors.push({ field: `themes[${index}]`, message: 'Each theme must be an object', value: theme });
      return;
    }

    const themeObj = theme as Record<string, any>;

    if (!isString(themeObj.name) || themeObj.name.trim() === '') {
      errors.push({
        field: `themes[${index}].name`,
        message: 'Theme name is required and must be a non-empty string',
        value: themeObj.name
      });
    }

    if (!isObject(themeObj.colors)) {
      errors.push({
        field: `themes[${index}].colors`,
        message: 'Theme colors must be an object',
        value: themeObj.colors
      });
    }
  });

  return errors;
};

// Simple toolset validation
const validateToolsets = (toolsets: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!isArray(toolsets)) {
    errors.push({ field: 'toolsets', message: 'Toolsets must be an array', value: toolsets });
    return errors;
  }

  toolsets.forEach((toolset: any, index: number) => {
    if (!isObject(toolset)) {
      errors.push({ field: `toolsets[${index}]`, message: 'Each toolset must be an object', value: toolset });
      return;
    }

    const toolsetObj = toolset as Record<string, any>;

    if (!isString(toolsetObj.name) || toolsetObj.name.trim() === '') {
      errors.push({
        field: `toolsets[${index}].name`,
        message: 'Toolset name is required and must be a non-empty string',
        value: toolsetObj.name
      });
    }

    const hasValidAllowedTools = toolsetObj.allowedTools === '*' ||
      (isArray(toolsetObj.allowedTools) && toolsetObj.allowedTools.every((tool: any) => isString(tool)));

    if (!hasValidAllowedTools) {
      errors.push({
        field: `toolsets[${index}].allowedTools`,
        message: 'allowedTools must be either "*" or an array of strings',
        value: toolsetObj.allowedTools
      });
    }
  });

  return errors;
};

// Simple settings validation
const validateSettings = (settings: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!isObject(settings)) {
    errors.push({ field: 'settings', message: 'Settings must be an object', value: settings });
    return errors;
  }

  const settingsObj = settings as Record<string, any>;

  // Validate themes
  if ('themes' in settingsObj) {
    errors.push(...validateThemes(settingsObj.themes));
  }

  // Validate toolsets
  if ('toolsets' in settingsObj) {
    errors.push(...validateToolsets(settingsObj.toolsets));
  }

  // Validate thinking verbs
  if (settingsObj.thinkingVerbs) {
    if (!isObject(settingsObj.thinkingVerbs)) {
      errors.push({
        field: 'settings.thinkingVerbs',
        message: 'Thinking verbs config must be an object',
        value: settingsObj.thinkingVerbs
      });
    }
  }

  // Validate thinking style
  if (settingsObj.thinkingStyle) {
    if (!isObject(settingsObj.thinkingStyle)) {
      errors.push({
        field: 'settings.thinkingStyle',
        message: 'Thinking style config must be an object',
        value: settingsObj.thinkingStyle
      });
    }
  }

  // Validate misc settings
  if (settingsObj.misc) {
    if (!isObject(settingsObj.misc)) {
      errors.push({
        field: 'settings.misc',
        message: 'Misc config must be an object',
        value: settingsObj.misc
      });
    }
  }

  return errors;
};

// Main validation function
export const validateTweakccConfig = (config: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isObject(config)) {
    errors.push({ field: 'config', message: 'Config must be an object', value: config });
    return { isValid: false, errors };
  }

  const configObj = config as Record<string, any>;

  // Validate required top-level fields
  if (!isString(configObj.ccVersion)) {
    errors.push({ field: 'ccVersion', message: 'ccVersion must be a string', value: configObj.ccVersion });
  }

  if (configObj.ccInstallationDir !== null && !isString(configObj.ccInstallationDir)) {
    errors.push({
      field: 'ccInstallationDir',
      message: 'ccInstallationDir must be either null or a string',
      value: configObj.ccInstallationDir
    });
  }

  if (!isString(configObj.lastModified)) {
    errors.push({ field: 'lastModified', message: 'lastModified must be a string', value: configObj.lastModified });
  }

  if (!isBoolean(configObj.changesApplied)) {
    errors.push({ field: 'changesApplied', message: 'changesApplied must be a boolean', value: configObj.changesApplied });
  }

  // Validate settings
  if (configObj.settings) {
    errors.push(...validateSettings(configObj.settings));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatValidationErrors = (errors: ValidationError[]): string => {
  if (errors.length === 0) return '';

  const errorLines = errors.map(error => {
    const valueStr = error.value !== undefined ? ` (value: ${JSON.stringify(error.value)})` : '';
    return `  • ${error.field}: ${error.message}${valueStr}`;
  });

  return `Configuration validation failed:\n${errorLines.join('\n')}`;
};