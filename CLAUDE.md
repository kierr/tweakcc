# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tweakcc** is a CLI tool (v3.1.0) that customizes Claude Code by patching its CLI files or binaries. It enables users to modify themes, system prompts, thinking verbs, toolsets, UI elements, and more. Supports both npm-installed and native/binary Claude Code installations across Windows, macOS, and Linux.

## Common Development Commands

```bash
# Install dependencies
bun install

# Development
bun watch          # Watch mode builds (hot reload)
bun start          # Run built CLI

# Build
bun build          # Production build (tsc + vite)
bun build:dev      # Development build with optimizations disabled

# Quality
bun lint           # Run TypeScript check + ESLint
bun test           # Run Vitest tests
bun format         # Format code with Prettier

# Single test file
bun test src/utils/config.test.ts
```

## Architecture

### Technology Stack
- **Language**: TypeScript (ES2022, Node16 modules)
- **UI Framework**: React with Ink (terminal-based React renderer)
- **Build Tool**: Vite (using rolldown-vite)
- **CLI Framework**: Commander.js
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript and React rules
- **Binary Patching**: node-lief for native installations

### Source Structure

```
src/
├── index.tsx           # CLI entry point (Commander.js + Ink renderer)
├── App.tsx             # Main React app with routing/context
├── components/         # UI components (Ink/React)
│   ├── MainView.tsx
│   ├── ThemesView.tsx
│   ├── ThinkingVerbsView.tsx
│   ├── ThinkingStyleView.tsx
│   ├── ToolsetsView.tsx
│   └── [other view components]
└── utils/              # Core utilities
    ├── config.ts       # Config file management
    ├── promptSync.ts   # System prompt synchronization
    ├── nativeInstallation.ts  # Native binary handling
    ├── patches/        # Individual customization modules
    │   ├── index.ts        # Patch orchestrator
    │   ├── themes.ts       # Theme customization
    │   ├── systemPrompts.ts
    │   ├── toolsets.ts
    │   └── [other patches]
    └── types.ts        # TypeScript types
```

### Key Entry Points

- **CLI Entry**: `src/index.tsx:42` - Commander.js setup with options (`--debug`, `--apply`, `--restore`, etc.)
- **Main App**: `src/App.tsx:35` - React app with SettingsContext, handles config loading
- **Patch Orchestrator**: `src/utils/patches/index.ts` - Applies all customizations to Claude Code
- **Config Management**: `src/utils/config.ts` - Reads/writes `~/.tweakcc/config.json`

### Build Configuration

- **TypeScript**: `tsconfig.json` - ES2022 target, Node16 modules, strict mode
- **Vite**: `vite.config.ts` - React plugin, external Node modules, custom entry point
- **Output**: `dist/index.js` - Single bundled entry file
- **ESLint**: `eslint.config.js` - TypeScript, React, Node globals

### Testing

- **Framework**: Vitest (minimal config in `vitest.config.ts`)
- **Test Files**: 3 test files covering config, types, and prompt sync utilities
- **Coverage**: Unit tests for core utilities
- **Location**: `src/utils/*.test.ts`

## Development Workflow

### Making Changes
1. Use `bun watch` during development for instant rebuilds
2. Run `bun test` to verify tests pass
3. Use `bun lint` to check code quality
4. Run `bun build` before committing

### Patch Development
Individual patches live in `src/utils/patches/`:
- Each patch module exports functions to apply/revert changes
- Patches modify Claude Code's `cli.js` (npm) or extract/modify/repack native binary
- Patches are orchestrated from `src/utils/patches/index.ts:52`

### Configuration
- User config: `~/.tweakcc/config.json` or `$XDG_CONFIG_HOME/tweakcc/config.json`
- System prompts: `~/.tweakcc/system-prompts/` (auto-populated from repo data)
- Backup files: `~/.tweakcc/cli.backup.js` or `~/.tweakcc/native-binary.backup`

## Technology Notes

- Uses **node-lief** for patching native Claude Code binaries (not just npm installations)
- **React + Ink** provides terminal-based interactive UI with keyboard navigation
- **Chalk** for terminal colors and styling
- **Gray-matter** for parsing YAML frontmatter in prompt files
- **Globby** for file pattern matching

## Important Files

- `README.md` - Comprehensive usage guide and troubleshooting
- `CHANGELOG.md` - Version history with semantic versioning
- `package.json` - Dependencies and scripts
- `data/prompts/` - JSON files with default system prompts for each CC version