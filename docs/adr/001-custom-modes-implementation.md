ADR 001: Custom Modes Implementation

## Status

Accepted

## Context

Claude Code has three built-in modes (accept edits, plan mode, dangerously skip) that control core behavior. Users have requested the ability to create their own custom modes with specific capabilities:

- Restrict tool access (e.g., "no-dangerous-tools" mode)
- Pre-configure behavior flags (thinking, accept edits, skip)
- Auto-switch toolsets for different contexts (e.g., "web-dev" mode)
- Apply custom system prompts for specialized tasks (e.g., "security-audit" mode)

The current system requires manual configuration changes and Claude Code restarts to switch between these custom behaviors. Users need runtime mode switching and a UI for managing these configurations.

## Decision

Implement a comprehensive custom modes system where:

1. **Mode Definition**: Users define modes in `~/.tweakcc/config.json` with properties:
   - `name`: Unique identifier (kebab-case)
   - `displayName`: Human-readable name
   - `description`: Mode purpose
   - `allowedTools`: Array of tool names or wildcard (`*`)
   - `systemPrompt`: Optional custom prompt appended to default
   - `behaviorFlags`: Object with `thinkingEnabled`, `planMode`, `acceptEdits`, `dangerouslySkip`
   - `toolsetName`: Optional auto-switch to named toolset
   - `icon`: Optional emoji/symbol for UI

2. **Runtime Mode Management**:
   - `/mode [name]` slash command for switching
   - Mode selection UI component for interactive switching
   - Active mode displayed in status line
   - Mode changes persist across sessions

3. **Behavior Enforcement**:
   - Tool filtering based on `allowedTools`
   - Behavior flags override Claude Code defaults
   - Optional toolset auto-switching
   - System prompt appending
   - All enforced at runtime without restart

4. **UI Components**:
   - `ModesView`: List, create, edit, delete modes
   - `ModeEditView`: Form for mode configuration
   - Integration with main menu

5. **Implementation Architecture**:
   - 9 sub-patches in `src/utils/patches/modes.ts`
   - Stack machine parsing for minified code safety
   - Robust error handling with fallbacks
   - Pattern utilities for code injection
   - Type-safe interfaces

## Rationale

### Why Custom Modes?

1. **Safety Boundaries**: Teams can restrict dangerous tools (Bash, Write, Edit) for junior developers or production environments

2. **Context-Specific Workflows**:
   - "Code Review Mode": Read-only tools for reviewing PRs
   - "Planning Mode": Analysis tools + plan mode behavior
   - "Security Audit Mode**: Specialized tools + custom system prompt

3. **Domain Expertise**: Specialized modes for different tech stacks (React, Django, DevOps)

4. **User Productivity**: One-click environment switching without manual reconfiguration

### Why This Implementation Approach?

1. **Leverages Existing Infrastructure**: Uses established patch patterns from themes, toolsets, and system prompts implementations

2. **Incremental Build-Up**: 9 sub-patches allow progressive implementation and validation (infrastructure → UI → advanced features → testing)

3. **Minified Code Safety**: Stack machine parsing and multi-anchor patterns handle Claude Code's minified JavaScript robustly

4. **Run-Time Flexibility**: No Claude Code restart needed - changes apply immediately

5. **Backward Compatibility**: Default mode (`"default"`) provides full tool access, maintaining existing behavior

### Why Not Alternatives?

**Alternative 1: Configuration Only (Rejected)**
- **Approach**: Static config file only, no runtime switching
- **Rejection**: Requires Claude Code restart, poor UX for frequent mode changes
- **Our Approach**: Runtime switching with `/mode` command and UI

**Alternative 2: Plugin System (Rejected)**
- **Approach**: Full plugin architecture for extensibility
- **Rejection**: Over-engineered for initial MVP, requires plugin API design
- **Trade-off**: Simple JSON config vs. complex plugin infrastructure

**Alternative 3: Environment Variables (Rejected)**
- **Approach**: `CLADE_MODE=coding claude` style switching
- **Rejection**: Not user-friendly, hard to discover, no tool filtering
- **Trade-off**: UI-driven management vs. command-line flags

**Alternative 4: Separate Claude Code Instances (Rejected)**
- **Approach**: Run multiple CC instances with different configs
- **Rejection**: Resource intensive, no sharing of state/history
- **Trade-off**: Single instance with runtime switching vs. multiple processes

## Implementation Details

### Patch Architecture (9 Sub-patches in `src/utils/patches/modes.ts`)

1. **App State Injection** (`subPatchAppState`)
   - Injects `mode` field into app state initialization
   - Follows pattern: add after `thinkingEnabled` in state object

2. **Mode Selection Command** (`subPatchModeCommand`)
   - Adds `/mode` slash command to commands array
   - Creates interactive mode selection component
   - Validates mode names and shows available modes

3. **Behavior Flags Enforcement** (`subPatchBehaviorFlags`)
   - Overrides `thinkingEnabled`, `planMode`, `acceptEdits`, `dangerouslySkip`
   - Mode config takes precedence over Claude Code defaults
   - Uses mode-aware logic injection at flag application points

4. **Toolset Auto-Switching** (`subPatchToolsetEnforcement`)
   - When mode specifies `toolsetName`, switch automatically
   - Getter property in state: `actualToolset: mode.toolsetName || defaultToolset`
   - Handles invalid toolset names gracefully

5. **Tool Filtering Logic** (`subPatchToolFiltering`)
   - Intercepts `tools: LA` assignment in options object
   - Filters tools based on `mode.allowedTools`
   - Wildcard (`*`) allows all tools
   - Caching: `cachedTools` per mode for performance

6. **Mode Persistence** (`subPatchModePersistence`)
   - Wraps `setState` to detect mode changes
   - Saves `activeMode` to `~/.tweakcc/config.json`
   - Loads on startup from config

7. **Status Line Display** (`subPatchStatusLine`)
   - Shows active mode in status banner
   - Format: `Mode: [icon] [displayName]`
   - Color-coded by mode (uses theme system)

8. **Mode Validation** (`subPatchModeValidation`)
   - Rejects invalid mode names on switch
   - Validates configuration on load
   - Schema: `z.object({ name: z.string().regex(/^[a-z0-9-]+$/), ... })`

9. **Error Handling & Fallbacks** (`subPatchErrorHandling`)
   - Try-catch wrappers around all mode operations
   - Gracious degradation: invalid mode → `"default"`
   - Console warnings for debugging

### Robust Pattern Matching

**Stack Machine Parser** (`src/utils/patterns.ts`):
```typescript
export function findMatchingBrace(
  content: string,
  startIndex: number
): number | null {
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return null; // No matching brace found
}
```

**Multi-Anchor Patterns**:
```typescript
// Instead of brittle patterns:
const badPattern = /thinkingEnabled:defaultThinkingValue/;

// Use robust patterns with context:
const goodPattern = /thinkingEnabled:[\w$()]+,\n\s*\w+:\{/;
```

### Type-Safe Interfaces

```typescript
export interface ModeConfigFlags {
  thinkingEnabled?: boolean;
  planMode?: boolean;        // Added: missing from original
  acceptEdits?: boolean;
  dangerouslySkip?: boolean;
}

export interface Mode {
  name: string;              // Unique ID (kebab-case)
  displayName: string;       // Human-readable
  description: string;
  allowedTools: string[] | '*';
  systemPrompt?: string;
  behaviorFlags: ModeConfigFlags;
  toolsetName?: string;      // Optional auto-switch
  icon?: string;             // Emoji/symbol
}

export interface Settings {
  // ... existing
  modes: Mode[];             // Mode definitions
  defaultMode: string | null;
  activeMode: string | null; // Runtime current mode
}
```

### UI Components

**ModesView.tsx** (list/manage modes):
- Displays all modes in scrollable list
- Current mode highlighted with icon and color
- Create/Edit/Delete actions
- Quick switch dropdown
- Mode details panel (tools, flags, description)

**ModeEditView.tsx** (create/edit form):
- Name/Display Name fields (with validation)
- Description textarea
- Icon picker (emoji selector)
- Tool selector: searchable multi-select or wildcard
- Toolset dropdown (optional)
- Behavior flags: 4 checkboxes
- System prompt textarea (optional, monospace font)
- Live preview of mode effects
- Save/Cancel with validation errors

### Configuration Example

```json
{
  "settings": {
    "modes": [
      {
        "name": "safe-mode",
        "displayName": "Safe Mode",
        "description": "Limited tools for beginners or production",
        "icon": "🛡️",
        "allowedTools": [
          "Read",
          "Glob",
          "Grep"
        ],
        "behaviorFlags": {
          "thinkingEnabled": true,
          "acceptEdits": false
        }
      },
      {
        "name": "security-audit",
        "displayName": "Security Audit",
        "description": "Security-focused analysis with custom prompt",
        "icon": "🔒",
        "allowedTools": "*",
        "behaviorFlags": {
          "thinkingEnabled": true,
          "acceptEdits": true
        },
        "systemPrompt": "You are a security auditor. Always consider security implications, OWASP guidelines, and potential vulnerabilities."
      },
      {
        "name": "web-dev",
        "displayName": "Web Development",
        "description": "Frontend development mode",
        "icon": "🌐",
        "toolsetName": "web-toolset",
        "allowedTools": "*",
        "behaviorFlags": {
          "thinkingEnabled": false
        }
      }
    ],
    "defaultMode": "safe-mode",
    "activeMode": "security-audit"
  }
}
```

## Consequences

### Positive Consequences

1. **User Empowerment**: Teams can enforce safety policies while allowing power users full access
2. **Workflow Efficiency**: One command switches entire development context
3. **Safety**: Restricted modes prevent accidental dangerous operations in sensitive environments
4. **Specialization**: Custom prompts create domain experts without modifying core Claude Code
5. **Flexibility**: Runtime switching removes friction from mode changes
6. **Maintainability**: Centralized configuration in JSON, UI for management
7. **Extensibility**: Architecture supports future enhancements (mode plugins, shared modes, etc.)

### Negative Consequences

1. **Code Complexity**: Adds ~500 lines of injected code across 9 sub-patches
2. **Maintenance Burden**: Updates to Claude Code may require patch adjustments
3. **Learning Curve**: Users must understand mode configuration (mitigated by UI)
4. **Performance**: Tool filtering adds ~5-10ms overhead (mitigated by caching)
5. **UI Real Estate**: Status line and mode management views add to interface
6. **Testing Matrix**: Must test across multiple Claude Code versions and configurations

### Performance Impact

- **Mode Switching**: <100ms (DOM update, state change, optional config write)
- **Tool Filtering**: ~5-10ms per command cycle (cached per mode: O(1) after first)
- **Memory**:  + ~50KB for mode config cache + 9 patch function references
- **Startup**: + ~20ms to load and validate mode configs

### Security Implications

- **Config Validation**: Zod schema prevents malformed mode configs from crashing CC
- **Tool Filtering**: Cannot bypass - enforced at runtime in options object
- **Path Traversal**: Config file path is hardcoded, no user input
- **Code Injection**: All injected code is from signed tweakcc distribution
- **Privilege Escalation**: Modes cannot grant more access than Claude Code base

## Integration Points

1. **Toolsets**: Auto-switch via `toolsetName` property
2. **System Prompts**: Append mode-specific prompts via `promptSync.ts`
3. **Themes**: Mode color coding via theme system (future enhancement)
4. **Status Line**: Display active mode alongside toolset indicator
5. **Commands**: `/mode` command integrates with existing slash command system

## Timeline

**Total: 5 weeks**

- **Phase 1** (Infrastructure): 1 week
  - Type definitions
  - Pattern utilities
  - 9 sub-patch skeletons

- **Phase 2** (UI): 1 week
  - ModesView component
  - ModeEditView component
  - Menu integration

- **Phase 3** (Advanced): 1 week
  - System prompt integration
  - Caching implementation
  - Keyboard shortcuts

- **Phase 4** (Testing): 1 week
  - Unit tests (Jest/Vitest)
  - Cross-version testing
  - Performance benchmarks

- **Phase 5** (Documentation): 1 week
  - README updates
  - ADR (this document)
  - User guide

**Buffer**: 3 days per phase for unexpected issues

## Success Criteria

1. **Functionality**: All 9 sub-patches inject correctly on CC 2.0.41 and latest version
2. **UI/UX**: Users can create, edit, delete, and switch modes via interface
3. **Command**: `/mode` works with both arguments and interactive selection
4. **Performance**: Mode operations complete in <100ms, no perceptible lag
5. **Reliability**: No console errors in normal operation, graceful fallbacks on errors
6. **Compatibility**: Works on npm installs, native binaries (macOS, Windows, Linux)
7. **Documentation**: Complete user guide, inline docs, ADR, README
8. **Test Coverage**: >80% code coverage for modes functionality
9. **No Regressions**: All existing tweakcc features unchanged

## Alternatives Considered

Detailed in [Revised Implementation Plan](../PLAN_CUSTOM_MODES_REVISED.md#why-not-alternatives)

## References

- [Revised Implementation Plan](../PLAN_CUSTOM_MODES_REVISED.md) - Detailed phase-by-phase tasks
- [Original Implementation Plan](../PLAN_CUSTOM_MODES.md) - Initial version (rejected for critical flaws)
- [Claude Code CLI Source Investigation](../cache/packages/2.0.41/package/cli.js) - Injection point analysis
- [Tweakcc Patch Infrastructure](../src/utils/patches/index.ts) - Existing patterns and utilities

## Decision Makers

- **Proposed by**: [Your Name/Team]
- **Reviewed by**: [Team Members]
- **Approved by**: [Technical Lead/Architecture Board]
- **Date**: [Current Date]

## Status

**Accepted** - Implementation proceeding per revised plan with Phase 1 (Infrastructure) prioritized.
