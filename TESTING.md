# Testing Guide for tweakcc Patches

## Manual Testing with Claude CLI

### Prerequisites
1. Build and apply patches:
```bash
bun run build
bun run start --restore
bun run start --apply
```

### Testing Task Tool Model Validation

The Task tool now supports custom model names via hybrid validation. To test:

```bash
claude "Use the Task tool with model param 'zen,big-pickle', general agent type, ask it to generate a haiku about Steve Jobs"
```

**Expected behavior:**
- ✅ If model is valid: Task tool executes successfully
- ✅ If model is invalid: Clear error message with guidance

### Testing with Different Model Names

#### Valid Models (should work):
- Built-in Claude models: `sonnet`, `opus`, `haiku`, `sonnet[1m]`, `opusplan`, `inherit`
- API-fetched models: Any model from `/model` list (like `zen,big-pickle`, `grok-code`, etc.)

#### Invalid Models (should fail with clear error):
```bash
claude "Use Task tool with model 'invalid-model-name'"
```

### How to Verify Patch Was Applied

1. Check the cli.js file for the updated schema:
```bash
grep -A5 'model: _.string()' /Users/user/.local/share/mise/installs/claude/2.0.42/lib/node_modules/@anthropic-ai/claude-code/cli.js | head -15
```

You should see:
```javascript
model: _.string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      
      // Check static validation against K2A first
      if (K2A.includes(val)) return;
      
      // Check dynamic models from API cache
      const isValidDynamic = global.claude_models_hardcoded?.some(m => m.value === val);
      
      if (!isValidDynamic) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_enum_value,
          message: "Invalid model. Use /model to see available models."
        });
      }
    })
```

2. Verify Mn array is unchanged (no fake models):
```bash
grep 'Mn=' /Users/user/.local/share/mise/installs/claude/2.0.42/lib/node_modules/@anthropic-ai/claude-code/cli.js | grep -o 'Mn=\[.*\]'
```

Should show only real Claude Code models:
```javascript
Mn=["sonnet","opus","haiku","sonnet[1m]","opusplan"]
```

## Understanding the Hybrid Validation

The Task tool model validation works at TWO levels:

### Level 1: Schema Validation (Zod)
- Uses `_.string()` instead of `_.enum()` to allow superRefine to run
- `superRefine()` validates against:
  1. **K2A array** (static: sonnet, opus, haiku, sonnet[1m], opusplan, inherit)
  2. **global.claude_models_hardcoded** (dynamic: API-fetched models)

### Level 2: Runtime Validation
- Existing `VU1()` function validates against Mn array
- `_U()` function normalizes and maps model names
- Final resolution through existing model infrastructure

## Patch Structure

New patch file: `src/utils/patches/taskToolModelSchema.ts`

Key concepts:
- **No hardcoded fake models** - Don't modify Mn array
- **Use superRefine()** - Allows runtime validation of dynamic models
- **Clear error messages** - Guide users to `/model` command

## Common Test Commands

### Test Custom Model Works
```bash
claude "Use Task tool with model 'zen,big-pickle', general subagent, generate a haiku"
```

### Test Built-in Model Still Works
```bash
claude "Use Task tool with model 'sonnet', general subagent, generate a haiku"
```

### Test Invalid Model Fails Gracefully
```bash
claude "Use Task tool with model 'fake-model-name', general subagent, generate a haiku"
```
Should show error: "Invalid model. Use /model to see available models."

### Check Available Models
```bash
/model
```
Shows all dynamically-loaded models from the API.
