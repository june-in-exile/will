# Circuit Testing Guide

## Overview

This directory contains tests for ZKP circuits used in the will system. Tests are divided into automatic tests (using `circom_tester`) and manual tests (for memory-intensive circuits).

## Test Infrastructure

### Test Framework

- **Main Framework**: `circom_tester` configured in `vitest.config.ts`
- **Special Case**: `workflow.test.ts` uses CLI-based testing
- **Custom Modifications**:
  - `release()`: Replaced due to issues in original implementation
  - `assertOut()` & `loadSymbols()`: Custom implementations to handle large `.sym` files

### WitnessTester Class

Extended from `circom_tester` and modified from circomkit. Implementation in [./util/construction.ts](./util/construction.ts):

- Locates correct `circomlib` path in `zkp/node_modules`
- Generates untagged templates (required because main template inputs cannot have tags)
- Constructs `wasm_tester` through `circom_tester` API

## Logic Simulation

The [./logic](./logic) directory contains TypeScript simulations of circuit behavior:

### Structure

- Function signatures align with circuits (except module functions)
- Used for debugging and testing circom implementations
- Not production-ready (performance and completeness trade-offs)

### Modules Directory

[./logic/modules](./logic/modules) contains simulated implementations of cryptographic components:

- **Components**: AES-CTR(GCM), ECDSA, Keccak256, etc.
- **Testing**: Each module includes internal tests
- **Purpose**: Debugging and testing only, not for production

### Example: ECDSA Implementation

Two `ecdsa.ts` files serve different purposes:

- **[./logic/modules/ecdsa.ts](./logic/modules/ecdsa.ts)**: Naive ECDSA implementation for observing signing scheme behavior
- **[./logic/ecdsa.ts](./logic/ecdsa.ts)**: Interface for testing ECDSA circuits, calls the module implementation

## Running Tests

### Available Commands

See `package.json` for full list:

```bash
pnpm test              # Run default tests
pnpm test:auto         # Automatic tests only
pnpm test:manual       # Manual tests only
pnpm test:modules      # All module tests
pnpm test:all          # All tests

# Component-specific tests
pnpm test:abiEncoder
pnpm test:keccak256
pnpm test:aesgcm
pnpm test:ecdsa
pnpm test:permitVerify
```

### Automatic Tests

Run directly with `circom_tester`:

```bash
pnpm test <test_file>.test.ts
```

### Manual Tests

For memory-intensive circuits (files with `.manual.test.ts` suffix):

1. Generate inputs:

   ```bash
   pnpm test cidUpload.manual.test.ts
   ```

2. Copy printed inputs to the appropriate input file:

   ```
   ../circuits/cidUpload/inputs/input.json
   ```

3. Compile and generate witness using [../Makefile](../Makefile)

### Memory Considerations

When running `pnpm test:all`:

- Some tests may fail due to memory constraints, not circuit issues
- Solution: Run failed tests independently
- Use manual tests for particularly large circuits

## Constraint Counts

After running tests, view constraint counts in [../constraintCounts.json](../constraintCounts.json)

### Customizing Output Order

1. Edit [./config/constraintCounts.json](./config/constraintCounts.json)
2. Delete [../constraintCounts.json](../constraintCounts.json)
3. Re-run tests to apply new arrangement
