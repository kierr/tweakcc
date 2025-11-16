# Implementation Plan: Custom Modes Feature for Tweakcc

## Overview
Add a custom modes system where users can define their own Claude Code modes, paired with specific toolsets, allowing flexible behavior customization beyond the built-in plan/accept/dangerously skip modes.

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)

**Goal:** Establish the foundation for custom modes

**Tasks:**
1. **Extend Type Definitions** (`src/utils/types.ts`)
   - Add `Mode` interface with name, description, allowed tools, behavior flags
   - Add `modes` and `defaultMode` fields to `Settings` interface
   - Update `DEFAULT_SETTINGS` with empty modes array

2. **Create Modes Patch Module** (`src/utils/patches/modes.ts`)
   - Implement 5 sub-patches:
     * **Patch 1:** Inject mode field into app state (after `thinkingEnabled` initialization)
     * **Patch 2:** Modify tool filtering logic to respect mode restrictions
     * **Patch 3:** Inject mode selection component definition
     * **Patch 4:** Add `/mode` slash command
     * **Patch 5:** Update status line to display active mode

3. **Update Patch Orchestrator** (`src/utils/patches/index.ts`)
   - Import and call `writeModes` function in `applyCustomization`
   - Ensure modes patch runs after toolsets patch

**Deliverables:**
- Functional mode switching via `/mode` command
- Basic mode state management
- Integration with existing toolset system

### Phase 2: Tool Integration & Filtering (Week 2)

**Goal:** Enable mode-specific tool access control

**Tasks:**
1. **Enhance Tool Filtering Logic**
   - Implement conditional tool filtering based on active mode
   - Support wildcard (`*`) for full tool access
   - Support specific tool whitelisting
   - Cache filtered tools for performance

2. **Mode ↔ Toolset Integration**
   - Allow modes to specify target toolset by name
   - Auto-switch toolset when mode changes
   - Handle mode/toolset conflicts gracefully
   - Update toolset display to show current mode context

**Deliverables:**
- Mode-specific tool filtering works correctly
- Smooth toolset switching on mode change
- Clear UI indication of active mode/toolset

### Phase 3: User Interface Components (Week 3)

**Goal:** Provide full UI for mode management

**Tasks:**
1. **Create Modes Views** (`src/components/ModesView.tsx`, `src/components/ModeEditView.tsx`)
   - Mode creation/editing interface
   - Mode list with delete/rename actions
   - Tool selection for each mode
   - Behavior flag configuration (thinking, accept edits, etc.)

2. **Update Main App** (`src/App.tsx`)
   - Add "Modes" menu option
   - Route to modes views
   - Integrate with existing menu system

**Deliverables:**
- Users can create, edit, and delete modes through UI
- Modes are persisted to config file
- Seamless integration with existing menu system

### Phase 4: Advanced Features (Week 4)

**Goal:** Implement sophisticated mode behaviors

**Tasks:**
1. **System Prompt Integration**
   - Allow modes to specify custom system prompts
   - Auto-load prompts on mode switch
   - Integrate with existing `promptSync` system

2. **Enhanced Behaviors**
   - Mode-specific keyboard shortcuts
   - UI theme changes per mode (colors, indicators)
   - Mode transition animations

**Deliverables:**
- Modes can inject custom system prompts
- Visual feedback for mode changes
- Extensible behavior system for future features

### Phase 5: Testing & Polish (Week 5)

**Goal:** Ensure reliability and usability

**Tasks:**
1. **Cross-Version Testing**
   - Test on Claude Code 2.0.42 and other versions
   - Verify patch patterns work consistently
   - Test graceful degradation for missing modes

2. **Error Handling & Edge Cases**
   - Invalid mode handling
   - Corrupted config recovery
   - Missing toolset/tool fallbacks

3. **Documentation**
   - Add usage examples to README
   - Document mode configuration options
   - Create troubleshooting guide

**Deliverables:**
- Feature works across Claude Code versions
- Robust error handling
- Complete user documentation

## Technical Implementation Details

### Key Code Injection Points

**1. App State Injection** (around line 440 in cli.js)
```javascript
// Find pattern: thinkingEnabled:defaultThinkingValue
// Insert after: ,mode:defaultModeValue
```

**2. Tool Filtering Logic** (in useMemo hook)
```javascript
// Inject conditional logic before tool filtering return
if (state.mode && modes[state.mode]) {
  const modeConfig = modes[state.mode];
  if (modeConfig.allowedTools === "*") {
    filteredTools = toolFilterFunction(contextVar);
  } else {
    filteredTools = toolFilterFunction(contextVar).filter(tool =>
      modeConfig.allowedTools.includes(tool.name)
    );
  }
}
```

**3. Mode Selection Component** (before commands array)
```javascript
const modeComp = ({ onExit, input }) => {
  const [state, setState] = appStateGetterFunction();

  if (input && !modes[input]) {
    onExit(chalk.red(`Invalid mode: ${input}`));
    return;
  }

  // Render mode selection UI
  return React.createElement(/* mode selection component */);
};
```

**4. Slash Command Addition** (to commands array)
```javascript
{
  aliases: ["change-mode"],
  type: "local-jsx",
  name: "mode",
  description: "Switch between custom modes",
  argumentHint: "[mode-name]",
  isEnabled: () => true,
  call: (onExit, ctx, input) => React.createElement(modeComp, { onExit, input })
}
```

**5. Status Line Update** (mode display area)
```javascript
// Find pattern: tl(modeVar).toLowerCase()," on"
// Replace with: tl(modeVar).toLowerCase()," on [",state.mode||defaultMode,"]"
```

### Data Structures

**Mode Interface:**
```typescript
interface Mode {
  name: string;
  description: string;
  allowedTools: string[] | '*';
  systemPrompt?: string;
  behaviorFlags: {
    thinkingEnabled?: boolean;
    acceptEdits?: boolean;
    dangerouslySkip?: boolean;
  };
  toolsetName?: string;
  uiTheme?: {
    bannerColor?: string;
    indicator?: string;
  };
}
```

**Settings Update:**
```typescript
interface Settings {
  // ... existing fields
  modes: Mode[];
  defaultMode: string | null;
}
```

### Integration Points

1. **With Toolsets:** Modes can reference and switch toolsets automatically
2. **With Themes:** Mode-specific visual themes and indicators
3. **With System Prompts:** Custom prompts loaded per mode
4. **With Status Line:** Clear indication of active mode

## Complexity Assessment

**Challenge Level:** Medium-High

**Key Challenges:**
- Regex pattern matching across minified Claude Code versions
- State synchronization between modes, toolsets, and prompts
- Performance impact of mode-aware tool filtering
- UI consistency with existing Claude Code patterns

**Mitigation Strategies:**
- Incremental development with testable milestones
- Robust pattern matching with fallbacks
- Comprehensive testing across Claude Code versions
- Modular design allowing feature toggles

## Verification Plan

**Testing Commands:**
```bash
# Unit tests
bun test src/utils/types.test.ts

# Integration test
bun test src/utils/patches/modes.test.ts

# End-to-end test
bun build && node dist/index.js --apply
```

**Expected Results:**
- Mode creation and switching works smoothly
- Tool filtering respects mode restrictions
- UI responds correctly to mode changes
- No regression in existing functionality
- Graceful handling of edge cases

---

**This plan provides a clear, actionable path to implementing custom modes with specific code changes, timelines, and verification criteria.**