# How to use?

## Prerequisite

1. Generate verifiers and proofs in [`../zkp/circuits`](../zkp/circuits).

## Initialization

1. (Forked Arbitrum Sepolia Only) Fork the Arbitrum Sepolia network.

   ```sh
   make fork
   ```

   Open a new terminal and run the following commands.

2. Build the contracts.

   ```sh
   make build
   ```

   - Before building the contracts, this command automatically completes these jobs under the hood:
     1. Updates the `USE_ANVIL` in `.env`
     2. Synchronizes with ZKPs
     3. Splits verifiers (to conform to 24,576 byte limit by to EIP-170)
   - After the building, this command then generates TypeScript types for the backends.
   - If build fails due to `Error: failed to resolve file`, try `make install` first.

3. Deploy all the necessary contracts at once.

   ```sh
   make deploy
   ```

   This will deploy the following (in the order):
   1. Verifiers:
      1. Groth16Verifiers:
         1. [`Multiplier2Verifier.sol`](./src/Multiplier2Verifier.sol) (dummy verifier)
         2. [`CidUploadVerifier.sol`](./src/CidUploadVerifier.sol)
         3. [`WillCreationVerifier.sol`](./src/WillCreationVerifier.sol)
      2. [`JsonCidVerifier.sol`](./src/JsonCidVerifier.sol)
   2. [`WillFactory.sol`](./src/WillFactory.sol)

   Note: The deployment of WillFactory contract requires all the verifers to be deployed first.
