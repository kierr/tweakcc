/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StringsPrompt } from './promptSync.js';

export interface PromptValidationError {
  promptId: string;
  promptName: string;
  field: string;
  message: string;
  identifier?: number | string;
  placeholder?: string;
}

export interface PromptValidationResult {
  isValid: boolean;
  warnings: PromptValidationError[];
  errors: PromptValidationError[];
}

export const validatePrompt = (prompt: StringsPrompt): PromptValidationResult => {
  const warnings: PromptValidationError[] = [];
  const errors: PromptValidationError[] = [];

  // Check for TODO_TOOL_OBJECT placeholders in identifierMap
  Object.entries(prompt.identifierMap).forEach(([key, value]) => {
    if (value === 'TODO_TOOL_OBJECT') {
      warnings.push({
        promptId: prompt.id,
        promptName: prompt.name,
        field: 'identifierMap',
        message: 'Found TODO_TOOL_OBJECT placeholder - this tool object needs to be defined',
        identifier: key,
        placeholder: value
      });
    } else if (value.includes('TODO') || value.includes('PLACEHOLDER')) {
      // Check for other TODO or PLACEHOLDER patterns (but not TODO_TOOL_OBJECT)
      warnings.push({
        promptId: prompt.id,
        promptName: prompt.name,
        field: 'identifierMap',
        message: `Found placeholder in identifierMap: ${value}`,
        identifier: key,
        placeholder: value
      });
    }
  });

  // Check for unmapped identifiers
  if (Array.isArray(prompt.identifiers)) {
    prompt.identifiers.forEach(identifier => {
      const mappedValue = prompt.identifierMap[String(identifier)];
      if (!mappedValue) {
        errors.push({
          promptId: prompt.id,
          promptName: prompt.name,
          field: 'identifiers',
          message: `Identifier ${identifier} has no mapping in identifierMap`,
          identifier
        });
      }
    });
  }

  // Check for empty or invalid fields
  if (!prompt.name || prompt.name.trim() === '') {
    errors.push({
      promptId: prompt.id,
      promptName: prompt.name,
      field: 'name',
      message: 'Prompt name is required'
    });
  }

  if (!prompt.id || prompt.id.trim() === '') {
    errors.push({
      promptId: prompt.id,
      promptName: prompt.name,
      field: 'id',
      message: 'Prompt ID is required'
    });
  }

  if (!Array.isArray(prompt.pieces) || prompt.pieces.length === 0) {
    errors.push({
      promptId: prompt.id,
      promptName: prompt.name,
      field: 'pieces',
      message: 'Prompt must have at least one piece'
    });
  }

  if (!Array.isArray(prompt.identifiers)) {
    errors.push({
      promptId: prompt.id,
      promptName: prompt.name,
      field: 'identifiers',
      message: 'Identifiers must be an array'
    });
  }

  if (prompt.identifiers.length > prompt.pieces.length) {
    errors.push({
      promptId: prompt.id,
      promptName: prompt.name,
      field: 'identifiers',
      message: 'More identifiers than pieces - this will cause runtime errors'
    });
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
};

export const validateStringsFile = (stringsFile: any): PromptValidationResult => {
  const allWarnings: PromptValidationError[] = [];
  const allErrors: PromptValidationError[] = [];

  if (!stringsFile || !Array.isArray(stringsFile.prompts)) {
    allErrors.push({
      promptId: 'unknown',
      promptName: 'unknown',
      field: 'prompts',
      message: 'Strings file must contain a prompts array'
    });
    return {
      isValid: false,
      warnings: allWarnings,
      errors: allErrors
    };
  }

  stringsFile.prompts.forEach((prompt: any, index: number) => {
    if (!prompt.id) {
      allErrors.push({
        promptId: `prompts[${index}]`,
        promptName: 'unknown',
        field: 'id',
        message: `Prompt at index ${index} is missing an ID`
      });
      return;
    }

    const result = validatePrompt(prompt);
    allWarnings.push(...result.warnings);
    allErrors.push(...result.errors);
  });

  return {
    isValid: allErrors.length === 0,
    warnings: allWarnings,
    errors: allErrors
  };
};

export const formatPromptValidationResults = (result: PromptValidationResult): string[] => {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('❌ Prompt Validation Errors:');
    result.errors.forEach(error => {
      const idStr = error.promptId !== 'unknown' ? ` (${error.promptId})` : '';
      const identifierStr = error.identifier ? ` [${error.identifier}]` : '';
      messages.push(`  • ${error.promptName}${idStr}${identifierStr}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    messages.push('⚠️  Prompt Validation Warnings:');
    result.warnings.forEach(warning => {
      const idStr = warning.promptId !== 'unknown' ? ` (${warning.promptId})` : '';
      const identifierStr = warning.identifier ? ` [${warning.identifier}]` : '';
      messages.push(`  • ${warning.promptName}${idStr}${identifierStr}: ${warning.message}`);
    });
  }

  return messages;
};

export const hasPlaceholders = (prompt: StringsPrompt): boolean => {
  return Object.values(prompt.identifierMap).some(value =>
    value.includes('TODO') || value.includes('PLACEHOLDER') || value === 'TODO_TOOL_OBJECT'
  );
};