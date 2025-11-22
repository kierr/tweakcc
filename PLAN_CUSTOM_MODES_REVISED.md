# Revised Implementation Plan: Custom Modes Feature for Tweakcc

## Critical Revisions Summary

**Status**: MAJOR REVISION REQUIRED — Original plan had fatal flaws in regex patterns, missing critical patches, and incorrect phase sequencing.

**Key Changes**:
1. Rewrote all regex patterns for minified code using stack machine parsing and multi-anchor patterns
2. Added 4 missing critical patches (behavior flags, toolset switching, persistence, validation)
3. Re-sequenced phases for incremental validation (UI before tool filtering)
4. Specified component designs with reference examples
5. Added robust error handling and fallback mechanisms

---

## Phase 1: Core Infrastructure & Type Foundation (Week 1)

**Goal**: Establish robust data structures and patch utilities

### Tasks:

#### 1. Extend Type Definitions (`src/utils/types.ts`)

```typescript
export interface ModeConfigFlags {
  thinkingEnabled?: boolean;
  planMode?: boolean;  // Added: Missing from original plan
  acceptEdits?: boolean;
  dangerouslySkip?: boolean;
}

export interface Mode {
  name: string;  // Unique identifier (kebab-case)
  displayName: string;  // Human-readable name
  description: string;
  allowedTools: string[] | '*';  // Tool whitelist or wildcard
  systemPrompt?: string;  // Optional custom system prompt
  behaviorFlags: ModeConfigFlags;
  toolsetName?: string;  // Auto-switch to this toolset
  icon?: string;  // Emoji or symbol for UI
}

export interface Settings {
  // ... existing fields
  modes: Mode[];  // Custom mode definitions
  defaultMode: string | null;  // Default mode on startup
  activeMode: string | null;  // Currently active mode (runtime only)
}
```

**Implementation Notes**:
- Add validation: `activeMode` must reference a valid mode in `modes` array
- Default value for `activeMode`: `"default"` (built-in mode with full tool access)
- Update `DEFAULT_SETTINGS` to include `modes: []`, `defaultMode: "default"`, `activeMode: "default"`

---

#### 2. Create Robust Pattern Utilities (`src/utils/patterns.ts`)

Create new utility module with regex patterns safe for minified code:

```typescript
// Safe patterns for minified Claude Code
export const PATTERNS = {
  // Finding React variable (handles Bun/Node differences)
  REACT_VAR: /\b(\w+)=\w+\.lazy\(/,

  // App state initialization - looks for thinkingEnabled pattern
  APP_STATE_THINKING: /thinkingEnabled:[\w$()]+,/g,

  // Tool options - matches tools:\s*\w+
  TOOLS_IN_OPTIONS: /tools:\s*\w+,/,

  // Commands array location
  COMMANDS_ARRAY_START: /Ss2=\w+\(\(\)=>\[/,
  COMMANDS_ARRAY_END: /\]\),/,

  // Command object structure
  COMMAND_OBJECT: /\{\s*type:\s*["']local-jsx["']/,

  // Status line patterns (need to discover actual location first)
  STATUS_BANNER: /dimColor:\s*\w+\},"tab to toggle/,
} as const;

// Stack machine parser for finding matching braces/brackets
export function findMatchingBrace(
  content: string,
  startIndex: number,
  openChar = '{',
  closeChar = '}'
): number | null {
  // Implementation using stack-based parsing
}
```

---

#### 3. Create Modes Patch Module (`src/utils/patches/modes.ts`)

Implement **9 sub-patches** in correct order:

```typescript
import { showDiff, findSelectComponentName } from './index.js';

export const writeModes = (
  oldFile: string,
  modes: Mode[],
  defaultMode: string,
  activeMode: string
): string | null => {
  let result = oldFile;

  result = subPatchAppState(result, defaultMode);
  if (!result) return null;

  result = subPatchModeCommand(result, modes);
  if (!result) return null;

  result = subPatchBehaviorFlags(result);
  if (!result) return null;

  result = subPatchToolsetEnforcement(result);
  if (!result) return null;

  result = subPatchToolFiltering(result);
  if (!result) return null;

  result = subPatchModePersistence(result);
  if (!result) return null;

  result = subPatchStatusLine(result);
  if (!result) return null;

  result = subPatchModeValidation(result);
  if (!result) return null;

  result = subPatchErrorHandling(result);
  if (!result) return null;

  return result;
};
```

**Sub-patch Details**:

##### Sub-patch 1: App State Injection
**Pattern**: Find `thinkingEnabled:[\w$()]+,` and inject `mode:"${activeMode}",`
**Location**: Around line 153138 in app state initialization
**Code**:
```typescript
const subPatchAppState = (content: string, activeMode: string): string | null => {
  const pattern = /thinkingEnabled:[\w$()]+,/g;
  const match = pattern.exec(content);
  if (!match) {
    console.error('Failed to find app state thinkingEnabled pattern');
    return null;
  }

  const insertIndex = match.index + match[0].length;
  const injection = `mode:"${activeMode}",`;

  const newContent = content.slice(0, insertIndex) + injection + content.slice(insertIndex);
  showDiff(content, newContent, injection, insertIndex, insertIndex);
  return newContent;
};
```

##### Sub-patch 2: Mode Selection Component & Slash Command
**Pattern**: Insert new command into `Ss2()` array
**Component Model**: Follow `toolsets.ts` pattern in conversationTitle.ts
**Code**:
```typescript
const subPatchModeCommand = (content: string, modes: Mode[]): string | null => {
  // Find commands array location
  const cmdPattern = /Ss2=\w+\(\(\)=>\[/;
  const cmdMatch = cmdPattern.exec(content);
  if (!cmdMatch) return null;

  // Find position after array start
  const insertIndex = cmdMatch.index + cmdMatch[0].length;

  // Generate mode component code
  const modeComponent = generateModeComponentCode(modes);

  // Insert before first element
  const newContent = content.slice(0, insertIndex) + '\n' + modeComponent + ',' + content.slice(insertIndex);

  showDiff(content, newContent, modeComponent, insertIndex, insertIndex);
  return newContent;
};

const generateModeComponentCode = (modes: Mode[]): string => {
  return `
// Mode selection component injected by tweakcc
const modeComp = ({ onExit, input }) => {
  const [state, setState] = appStateGetterFunction();

  // Validate input mode if provided
  if (input && !modes.find(m => m.name === input)) {
    onExit(chalk.red(\`Mode \\"\${input}\\" not found. Available: \\\`{\${modes.map(m => m.name).join(', ')}}\\\`\`));
    return;
  }

  const targetMode = input || (() => {
    // Show mode selection UI if no input
    return React.createElement(SelectComponent, {
      items: modes.map(m => ({
        label: \`\${m.icon || '🎯'} \${m.displayName}\`,
        value: m.name
      })),
      onSelect: (modeName) => {
        setState(s => ({ ...s, mode: modeName }));
        onExit(chalk.green(\`Switched to mode: \${modeName}\`));
      }
    });
  })();

  if (input) {
    setState(s => ({ ...s, mode: input }));
    onExit(chalk.green(\`Switched to mode: \${input}\`));
  }

  return targetMode;
};

// Add mode command to commands array
{
  aliases: ["change-mode", "switch-mode"],
  type: "local-jsx",
  name: "mode",
  description: "Switch between custom modes",
  argumentHint: "[mode-name]",
  isEnabled: () => true,
  isHidden: false,
  async call(onExit, ctx, input) {
    return React.createElement(modeComp, { onExit, input });
  },
  userFacingName() {
    return "mode";
  }
}
  `;
};
```

##### Sub-patch 3: Behavior Flags Application
**Missing from original plan - CRITICAL**
Pattern: Find where behavior flags are applied and inject mode-aware logic

```typescript
const subPatchBehaviorFlags = (content: string): string | null => {
  // Find where thinkingEnabled, acceptEdits, dangerouslySkip are used
  // Inject mode-aware logic after app state is read
  // Example: If mode has thinkingEnabled override, use it

  const pattern = /const\s+thinkingEnabled\s*=\s*[\w$]+\.thinkingEnabled/g;
  const match = pattern.exec(content);
  if (!match) return content; // Optional patch

  // Inject mode check before thinkingEnabled usage
  const modeCheck = `
    // Mode-aware behavior flags (injected by tweakcc)
    const modeConfig = modes.find(m => m.name === state.mode);
    const actualThinkingEnabled = modeConfig?.behaviorFlags?.thinkingEnabled !== undefined
      ? modeConfig.behaviorFlags.thinkingEnabled
      : ${match[0].split('=')[1].trim()};
  `;

  const newContent = content.slice(0, match.index) + modeCheck + content.slice(match.index);
  showDiff(content, newContent, modeCheck, match.index, match.index);
  return newContent;
};
```

##### Sub-patch 4: Toolset Auto-Switching
**Missing from original plan - CRITICAL**
```typescript
const subPatchToolsetEnforcement = (content: string): string | null => {
  // Find where toolset is determined and inject mode-aware switching
  // When mode changes, automatically switch to mode.toolsetName

  const pattern = /defaultToolset:\s*\w+,/;
  const match = pattern.exec(content);
  if (!match) return content; // Optional patch

  const injection = `
    // Mode-based toolset switching (injected by tweakcc)
    get actualToolset() {
      const modeConfig = modes.find(m => m.name === this.mode);
      return modeConfig?.toolsetName || this.defaultToolset;
    },
  `;

  const insertIndex = match.index + match[0].length;
  const newContent = content.slice(0, insertIndex) + injection + content.slice(insertIndex);
  showDiff(content, newContent, injection, insertIndex, insertIndex);
  return newContent;
};
```

##### Sub-patch 5: Tool Filtering Logic
**Revised from original plan using robust patterns**
```typescript
const subPatchToolFiltering = (content: string): string | null => {
  // Find tools: LA in options object
  const pattern = /tools:\s*\w+,/;
  const match = pattern.exec(content);
  if (!match) {
    console.error('Failed to find tools pattern in options');
    return null;
  }

  // Replace simple tools assignment with filtered version
  const toolsVar = match[0].match(/tools:\s*(\w+),/)?.[1];
  if (!toolsVar) return null;

  const replacement = `
    tools: (() => {
      // Mode-aware tool filtering (injected by tweakcc)
      const allTools = ${toolsVar};
      const modeConfig = modes.find(m => m.name === state.mode);

      if (!modeConfig || modeConfig.allowedTools === '*') {
        return allTools;
      }

      const filtered = allTools.filter(tool =>
        modeConfig.allowedTools.includes(tool.name)
      );

      if (filtered.length === 0) {
        console.warn(\`Mode \\\`{\${state.mode}}\\\` has no accessible toolsackslash
`);
        return allTools; // Fallback to all tools
      }

      return filtered;
    })(),
  `;

  const newContent = content.slice(0, match.index) + replacement + content.slice(match.index + match[0].length);
  showDiff(content, newContent, replacement, match.index, match.index + match[0].length);
  return newContent;
};
```

##### Sub-patch 6: Mode Persistence
**Missing from original plan - CRITICAL**
```typescript
const subPatchModePersistence = (content: string): string | null => {
  // Inject mode persistence when state changes
  // Save to config when mode is switched

  const pattern = /setState:\s*\w+,/;
  const match = pattern.exec(content);
  if (!match) return content; // Optional patch

  // Find the setState function definition and wrap it
  // This is complex - needs finding function boundaries with stack parser

  const injection = `
    // Mode persistence wrapper (injected by tweakcc)
    const originalSetState = stateSetter;
    const setState = (updater) => {
      const prevState = getCurrentState();
      originalSetState(updater);
      const newState = getCurrentState();

      // Persist mode if it changed
      if (prevState.mode !== newState.mode) {
        try {
          const fs = require('fs');
          const path = require('path');
          const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.tweakcc/config.json');
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          config.settings.activeMode = newState.mode;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (e) {
          console.error('Failed to persist mode:', e);
        }
      }
    };
  `;

  const newContent = content.slice(0, match.index) + injection + content.slice(match.index);
  showDiff(content, newContent, injection, match.index, match.index);
  return newContent;
};
```

##### Sub-patch 7: Status Line Update
**Revised - needs discovery of actual location**
```typescript
const subPatchStatusLine = (content: string): string | null => {
  // Find status banner (help/info panel)
  const pattern = /dimColor:\s*\w+\},"tab to toggle/;
  const match = pattern.exec(content);
  if (!match) return content; // Optional patch

  // Find the containing element stack
  // Use stack machine to find matching braces

  // Inject mode display element
  const injection = `
    React.createElement(BoxComponent, { flexDirection: "row" },
      React.createElement(TextComponent, { color: "cyan" }, "Mode: "),
      React.createElement(TextComponent, { bold: true, color: "yellow" }, state.mode || "default")
    ),
  `;

  // Find position after the dimColor element closes
  const insertIndex = findElementCloseIndex(content, match.index);
  if (insertIndex === null) return content;

  const newContent = content.slice(0, insertIndex) + injection + content.slice(insertIndex);
  showDiff(content, newContent, injection, insertIndex, insertIndex);
  return newContent;
};
```

##### Sub-patch 8: Mode Validation & Error Handling
**Missing from original plan - CRITICAL**
```typescript
const subPatchModeValidation = (content: string): string | null => {
  // Wrap mode changes with validation
  const pattern = /setState\(s\s*=>\s*\(\{[^}]+mode:/;
  const match = pattern.exec(content);
  if (!match) return content; // Optional

  const injection = `
    // Validate mode before setting
    if (!modes.find(m => m.name === newMode)) {
      throw new Error(\`Invalid mode: \${newMode}\`);
    }
  `;

  const newContent = content.slice(0, match.index) + injection + content.slice(match.index);
  return newContent;
};

const subPatchErrorHandling = (content: string): string | null => {
  // Add error boundaries and fallbacks
  // Wrap critical mode operations in try-catch

  const pattern = /mode:\s*\w+,/;
  const match = pattern.exec(content);
  if (!match) return content;

  const injection = `
    // Safe mode getter with fallback
    const getActiveMode = () => {
      try {
        const mode = state.mode;
        if (!modes.find(m => m.name === mode)) {
          console.warn(\`Invalid mode 'ackslash
` + '${mode}' + `" detected, falling back to default\`);
          return "default";
        }
        return mode;
      } catch (e) {
        console.error('Error getting active mode:', e);
        return "default";
      }
    };
  `;

  const newContent = content.slice(0, match.index) + injection + content.slice(match.index);
  return newContent;
};
```

---

## Phase 2: UI Components & User Experience (Week 2)

**Goal**: Provide complete UI for mode management

### Tasks:

#### 1. Create Modes Management View (`src/components/ModesView.tsx`)

**Model After**: `ToolsetsView.tsx` pattern

**Features**:
- List all configured modes
- Display mode properties (name, description, allowed tools count, toolset, icon)
- Create new mode
- Edit existing mode
- Delete mode (with confirmation)
- Quick switch mode (dropdown or list selection)
- Show current active mode indicator

**Component Structure**:
```typescript
const ModesView = () => {
  const { settings, setSettings } = useContext(SettingsContext);

  const handleSwitchMode = (modeName: string) => {
    // Update active mode immediately
    setSettings({ ...settings, activeMode: modeName });
  };

  const handleCreateMode = () => {
    navigate('/modes/new');
  };

  const handleEditMode = (modeName: string) => {
    navigate(`/modes/edit/${modeName}`);
  };

  const handleDeleteMode = (modeName: string) => {
    // Confirm then delete
    const newModes = settings.modes.filter(m => m.name !== modeName);
    setSettings({ ...settings, modes: newModes });
  };

  return (
    <Box flexDirection="column">
      <Text bold>Custom Modes Management</Text>
      {/* Mode list with current indicator */}
      {/* Create/Edit/Delete controls */}
      {/* Quick switch interface */}
    </Box>
  );
};
```

#### 2. Create Mode Edit/Create View (`src/components/ModeEditView.tsx`)

**Model After**: Tool editing pattern in `ToolsetsView.tsx`

**Features**:
- Form for mode properties
  - name (kebab-case, required, unique)
  - displayName (human-readable, required)
  - description (optional)
  - icon (emoji picker or text input)
- Tool selector (multi-select with wildcards)
  - List all available tools from Claude Code
  - Checkbox list or searchable multi-select
  - "Wildcards (*)" checkbox
- Toolset selector (dropdown of available toolsets)
- Behavior flags (checkboxes)
  - thinkingEnabled (checkbox)
  - planMode (checkbox)
  - acceptEdits (checkbox)
  - dangerouslySkip (checkbox)
- System prompt editor (textarea, optional)
- Validation on save
- Preview of mode effects

**Form Validation**:
- `name`: Must be kebab-case, unique, not empty
- `displayName`: Not empty
- `allowedTools`: At least one tool if not wildcard
- `name` cannot be "default" (reserved)

#### 3. Update Main Menu (`src/App.tsx`)

Add to `MainMenuItem` enum:
```typescript
export enum MainMenuItem {
  // ... existing items
  MODES = 'Modes',  // Add this
}
```

Update menu rendering to include Modes option that routes to `/modes`.

---

## Phase 3: Advanced Features & Integration (Week 3)

**Goal**: Implement sophisticated mode behaviors and system integration

### Tasks:

#### 1. System Prompt Integration

**Implementation**:
- When mode has `systemPrompt`, append to default prompt
- Use existing `promptSync.ts` infrastructure
- Add mode system prompts to cache key calculation

**Patch Location**: In prompt generation logic, after default prompt is loaded

```typescript
// In modes.ts sub-patch
const subPatchSystemPrompt = (content: string): string | null => {
  const pattern = /getSystemPrompt\(\w+\)\s*\{[^}]+const\s+prompt/;
  const match = pattern.exec(content);
  if (!match) return content;

  const injection = `
    // Append mode-specific system prompt
    const activeMode = state.mode || "default";
    const modeConfig = modes.find(m => m.name === activeMode);
    if (modeConfig?.systemPrompt) {
      prompt += `\\n\\n--- Mode: ${modeConfig.displayName} ---\\n${modeConfig.systemPrompt}`;
    }
  `;

  // Find position after prompt declaration
  const newContent = content.slice(0, match.index) + injection + content.slice(match.index);
  return newContent;
};
```

#### 2. Enhanced Behaviors

**UI Theme Changes**:
- Use `icon` field from mode in status indicator
- Color-code mode indicators (use theme system)

**Mode Transition Animations**:
- Brief "Mode switching..." indicator when changing modes
- Use existing loading patterns from `ThinkingStyleView.tsx`

**Mode History**:
- Track recently used modes
- Quick switch keyboard shortcut (Ctrl+M)

#### 3. Toolset Deep Integration

**Conflict Resolution**:
- If both toolset and mode specify allowedTools, mode takes precedence
- Clear warnings in UI when conflicts detected

**Enhanced Filtering**:
- Cache filtered tools per mode for performance
- Invalidate cache when mode changes

```typescript
// Caching implementation
let cachedTools = null;
let cachedMode = null;

const getFilteredTools = (allTools, currentMode) => {
  if (cachedMode === currentMode && cachedTools) {
    return cachedTools;
  }

  // Apply filtering
  const modeConfig = modes.find(m => m.name === currentMode);
  cachedMode = currentMode;
  cachedTools = modeConfig?.allowedTools === '*'
    ? allTools
    : allTools.filter(t => modeConfig.allowedTools.includes(t.name));

  return cachedTools;
};
```

---

## Phase 4: Testing & Robustness (Week 4)

**Goal**: Ensure reliability and handle edge cases

### Tasks:

#### 1. Comprehensive Test Suite

**Unit Tests** (`src/utils/patches/modes.test.ts`):
```typescript
describe('writeModes', () => {
  describe('App State Injection', () => {
    it('injects mode field after thinkingEnabled');
    it('handles missing thinkingEnabled gracefully');
    it('uses correct active mode value');
  });

  describe('Mode Command', () => {
    it('adds mode command to commands array');
    it('validates mode name on switch');
    it('shows mode selection UI when no input');
  });

  describe('Tool Filtering', () => {
    it('filters tools based on mode whitelist');
    it('allows all tools with wildcard');
    it('returns all tools if mode has no allowedTools');
    it('handles missing mode gracefully (fallback to default)');
  });

  describe('Behavior Flags', () => {
    it('overrides thinkingEnabled from mode config');
    it('overrides acceptEdits from mode config');
    it('overrides dangerouslySkip from mode config');
    it('falls back to default when mode flag undefined');
  });

  describe('Toolset Switching', () => {
    it('switches to mode-specified toolset');
    it('falls back to default toolset when mode has none');
    it('handles invalid toolset name gracefully');
  });

  describe('Validation & Error Handling', () => {
    it('rejects invalid mode names');
    it('falls back to default mode on errors');
    it('logs warnings for misconfigured modes');
    it('continues operation when mode persistence fails');
  });
});
```

**Integration Tests**:
- Test complete mode lifecycle: create → switch → use tools → observe behavior
- Test mode/toolset interaction scenarios
- Test system prompt appending

#### 2. Cross-Version Testing

Test against multiple Claude Code versions:
- 2.0.41 (source available)
- Latest stable
- Native binary installations (macOS, Windows)

Create automated test harness:
```bash
# Test pattern matching against different versions
bun test:cross-version

# Verify patches apply without errors
bun test:patches
```

#### 3. Performance Testing

Benchmark tool filtering:
- Measure impact of mode-aware filtering on startup time
- Memory usage with many modes/toolsets
- Optimization: cache filtered tools per mode

```typescript
// Performance monitoring
const start = performance.now();
const filteredTools = applyModeFiltering(allTools, activeMode);
const duration = performance.now() - start;

if (duration > 10) {
  console.warn(\`Slow mode filtering: ackslash
` + '${duration}ms\`);
}
```

#### 4. Error Handling Matrix

| Scenario | Expected Behavior |
|----------|------------------|
| Invalid mode name in config | Fallback to "default", log warning |
| Mode references non-existent toolset | Ignore toolset, use mode's allowedTools |
| Mode has empty allowedTools array | Fallback to all tools, log warning |
| Mode persistence fails (disk full) | Continue operation, log error |
| Corrupted config.json | Reset to defaults with user notification |

---

## Phase 5: Documentation & Polish (Week 5)

### Tasks:

#### 1. User Documentation

**README.md Updates**:
- Feature overview with screenshots
- `/mode` command usage
- Creating custom modes through UI
- Example use cases:
  - "Safe Mode" (limited tools for beginners)
  - "Advanced Mode" (dangerous tools for experts)
  - "Planning Mode" (analysis tools only)
  - "Custom Prompt Mode" (specialized system prompt)

**Configuration Guide**:
- Mode configuration reference
- Tool whitelist syntax
- Behavior flag options
- System prompt templating

#### 2. Architecture Decision Record (ADR)

**doc/adr/001-custom-modes-implementation.md**:

```markdown
# ADR 001: Custom Modes Implementation

## Status
Accepted

## Context
Claude Code has three built-in modes (accept edits, plan mode, dangerously skip) but users need custom behavior profiles.

## Decision
Implement a mode system where:
- Modes define: allowed tools, behavior flags, system prompts, toolsets
- Runtime mode switching via `/mode` command
- UI for mode management
- Persistence in config file

## Rationale
1. **Extensibility**: Users can define domain-specific modes
2. **Safety**: Restrict tools for sensitive operations
3. **Productivity**: Pre-configured environments for tasks
4. **Flexibility**: Runtime switching without restart

## Implementation Details
- 9 sub-patches in modes.ts
- Leverages existing patch infrastructure
- Robust regex patterns for minified code
- Comprehensive error handling

## Consequences
- Increases patch complexity (9 sub-patches)
- Adds ~500 lines of injected code
- Creates new UI views (2 components)
- May require updates for Claude Code version changes

## Alternatives Considered
1. **Configuration-only**: Rejected (no runtime switching)
2. **Plugin system**: Rejected (too complex for initial implementation)
3. **Environment variable**: Rejected (not user-friendly)
```

#### 3. Inline Code Documentation

- Document all regex patterns with what they match
- Add JSDoc to all functions with `@param` and `@returns`
- Explain fallback logic and error conditions
- Document utility functions in `patterns.ts`

---

## Testing & Verification

### Automated Testing

```bash
# Run unit tests
bun test src/utils/patches/modes.test.ts

# Run integration tests
bun test src/utils/patches/modes.integration.test.ts

# Run cross-version tests
bun test:cross-version

# Verify patches against Claude Code 2.0.41
bun build && node dist/index.js --debug --apply
```

### Manual Testing Checklist

- [ ] Create new mode via UI
- [ ] Edit existing mode
- [ ] Delete mode
- [ ] Switch mode via `/mode` command
- [ ] Switch mode via UI dropdown
- [ ] Verify tool filtering works
- [ ] Verify behavior flags apply (thinkingEnabled)
- [ ] Verify toolset auto-switching
- [ ] Verify system prompt appending
- [ ] Verify status line shows active mode
- [ ] Verify mode persistence across restarts
- [ ] Test fallback to default mode on errors
- [ ] Verify no regression in existing features

### Expected Results

- Mode switching completes in <100ms
- Tool filtering doesn't add >10ms overhead
- No console errors in normal operation
- Graceful handling of all error scenarios
- UI responsive on mode changes

---

## Implementation Checklist

### Before Coding
- [ ] Review revised plan with team
- [ ] Set up test environment with multiple CC versions
- [ ] Freeze TypeScript interfaces (no changes after coding starts)

### Phase 1: Infrastructure
- [ ] Extend types in `src/utils/types.ts`
- [ ] Create `src/utils/patterns.ts` with robust patterns
- [ ] Create `src/utils/patches/modes.ts` with 9 sub-patches
- [ ] Update orchestrator in `src/utils/patches/index.ts`
- [ ] Write tests for patterns and sub-patches

### Phase 2: UI Components
- [ ] Create `src/components/ModesView.tsx`
- [ ] Create `src/components/ModeEditView.tsx`
- [ ] Update `src/App.tsx` with menu
- [ ] Write component tests
- [ ] Manual testing of UI workflows

### Phase 3: Advanced Features
- [ ] Implement system prompt integration
- [ ] Add caching for tool filtering
- [ ] Implement mode history tracking
- [ ] Add keyboard shortcuts
- [ ] Performance optimization

### Phase 4: Testing & Robustness
- [ ] Write comprehensive test suite
- [ ] Cross-version compatibility testing
- [ ] Performance benchmarking
- [ ] Error scenario testing
- [ ] Security review (config validation)

### Phase 5: Documentation
- [ ] Update README.md
- [ ] Create ADR doc
- [ ] Write inline documentation
- [ ] Create user guide
- [ ] Review all documentation

### Final
- [ ] Code review
- [ ] Integration testing
- [ ] Performance verification
- [ ] Merge to main

---

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Regex patterns fail on minified code | HIGH | Use stack machine parser, test on actual minified builds, add fallback patterns |
| State desynchronization | HIGH | 9 sub-patches with clear responsibilities, validation on every mode change |
| Performance degradation | MEDIUM | Tool caching, early returns, optimize validation |
| CC version breaks patches | MEDIUM | Cross-version testing, pattern versioning, graceful degradation |
| Configuration corruption | LOW | Schema validation, backup before write, atomic writes |
| UX confusion | LOW | Clear indicators, confirmation dialogs, comprehensive documentation |

---

## Timeline

**Total**: 5 weeks

- Phase 1 (Infrastructure): 1 week
- Phase 2 (UI): 1 week
- Phase 3 (Advanced): 1 week
- Phase 4 (Testing): 1 week
- Phase 5 (Documentation): 1 week

**Buffer**: 3 days per phase for unexpected issues

---

## Success Criteria

1. **Functionality**: All 9 sub-patches work correctly on CC 2.0.41 and latest version
2. **UI**: Users can create, edit, delete, and switch modes via interface
3. **Command**: `/mode` command works with and without arguments
4. **Performance**: Mode operations complete in <100ms
5. **Reliability**: No console errors in normal use, graceful fallbacks on errors
6. **Documentation**: Complete user guide and ADR
7. **Tests**: >80% coverage of modes functionality
8. **No Regressions**: All existing tweakcc features work unchanged

---

**Document Version**: 2.0 (Revised)
**Last Updated**: [Current Date]
**Status**: Ready for Implementation
