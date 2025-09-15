# Tests for Circuits

1. How the test works?
   1. `workflow.test.ts` tests with the CLI. The other tests are based on `circom_tester`.
      - some of the `circom_tester` function are replaced:
        - release(): the original one doesn't work
        - assertOut() && loadSymbols(): built-in loadSymbols() failed when reading large `.sym` files.
      - `circom_tester` is configured in `vitest.config.ts`
   2. The class WitnessTester is an extension of `circom_tester` and is modified from circomkit.
      - [./util/construction.ts](./util/construction.ts)
        - find the correct `circomlib` path in `zkp/node_modules`
        - generate untagged template
          - Why needs untag? the input of main template cannot have tag
        - construct the wasm_tester through the API provided by `circom_tester`.

2. The functions in [./logic](./logic) simulate the behavior of the circuits.
   - The input and output types of the functions are aligned with the circuits (except for the functions in modules).
   - [./logic/modules](./logic/modules) contain simulated implementations of key ZKP components in our will system.
     - e.g., AES-CTR(GCM), ECDSA, Kaccak256, etc.
     - Each of the module contain test inside it.
     - The implementations are not used for production (worse performance compared to official modules, incomplete functioning). Rather, they are only used for debuggin and testing the circom.
   - For exmaple, there are two `ecdsa.ts` files under the logic directory.
     - [./logic/modules/ecdsa.ts](./logic/modules/ecdsa.ts): Naive inplementation of ECDSA. You can observe ECDSA signing scheme's behavior with this ECDSA class.
     - [./logic/ecdsa.ts](./logic/ecdsa.ts): plays as interface for testing the ecdsa circuits and calling [./logic/modules/ecdsa.ts](./logic/modules/ecdsa.ts) under the hood.

3. Test commands can be found in package.json:

   ```json
   "test": "vitest run",
   "test:watch": "vitest",
   "test:abiEncoder": "pnpm exec tsx ./tests/logic/modules/abiEncoder.ts",
   "test:keccak256": "pnpm exec tsx ./tests/logic/modules/keccak256.ts",
   "test:aesgcm": "pnpm exec tsx ./tests/logic/modules/aesGcm.ts",
   "test:ecdsa": "pnpm exec tsx ./tests/logic/modules/ecdsa.ts",
   "test:permitVerify": " pnpm exec tsx ./tests/logic/modules/permitVerify.ts",
   "test:all": "pnpm exec tsx ./tests/logic/modules/runTests.ts && vitest run --reporter=basic",
   ```

   - If you run all the tests at once (`pnpm test:all`), some of the tests might fail not due to issues about circuits but due to running out of memory. In that case you can run the failed tests independently (e.g., [ecdsa.test.ts](ecdsa.test.ts)).

4. After running the tests, you can find the number of constrains for each circuit (template) in [../constrainCounts.json](../constrainCounts.json)
   - The order of the constrain counts can be rearranged [./config/constraintCounts.json](./config/constraintCounts.json)
     - Delete the original [../constraintCounts.json](../constraintCounts.json) so that the new arrangement can take effect.
