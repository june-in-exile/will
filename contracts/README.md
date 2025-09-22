# How to use?

## Prerequisite

1. Generate ZKP in [../zkp/](../zkp/).

## Initialization

1. (Forked Arbitrum Sepolia Only) Fork the Arbitrum Sepolia network.

   ```sh
   make fork
   ```

   Open a new terminal and run the following commands.

2. Update the `USE_ANVIL` in `.env`, build the contracts, generate TypeScript types, etc.

   ```sh
   make build
   ```

3. Deploy `Groth16Verifier.sol`.

   Check the deployment

   ```sh
   make groth16verify-on-chain
   ```

   If it returns `true`, skip the deployment. Otherwise, execute the instruction.

   ```sh
   make deploy-groth16verifier
   ```

4. Deploy `JsonCidVerifier.sol`.

   Check the deployment

   ```sh
   make jsoncidverify-on-chain
   ```

   If it returns `true`, skip the deployment. Otherwise, execute the instruction.

   ```sh
   make deploy-jsonCidVerifier
   ```

5. Deploy `WillFactory.sol`.

   Check the deployment

   > ```sh
   > make cidUploadVerifier
   > make willCreateVerifier
   > make executor
   > ```

   If it returns the expected value, skip the deployment. Otherwise, ensure that the `JSON_CID_VERIFIER`, `UPLOAD_CID_VERIFIER`, `CREATE_WILL_VERIFIER` in the `.env` are set. Then, execute the instruction.

   ```sh
   make deploy-willFactory
   ```

## Execution

### Phase1: Encrypt & Upload Will

1. Follow the [backend's](../apps/backend/) "Phase1: Encrypt & Upload Will" instructions to predict the address, generate the signature, encrypt the will, and upload it to IPFS.

2. Upload the `CID` to the WillFactory contract.

   ```sh
   make uploadCid
   ```

   > Check
   >
   > ```sh
   > make testatorValidateTime
   > ```

### Phase2: Probation

1. Follow the [backend's](../apps/backend/) "Phase2: Probation" instructions to doownload the will from the IPFS, decrypt it, and sign the cid as the executor.

2. Notarize the `CID` in the WillFactory contract.

   ```sh
   make notarizeCid
   ```

   > Check
   >
   > ```sh
   > make executorValidateTime
   > ```

### Phase3: Decrypt & Execute Will

1. Deploy `Will.sol`.

   ```sh
   make createWill
   ```

   > Check
   >
   > ```sh
   > make permit2
   > make will
   > make testator
   > make estate0
   > make estate1
   > make executed-before
   > ```

2. (Arbitrum Sepolia only) Verify `Will.sol`.

   Check the contract on https://sepolia.arbiscan.io/address/\<WILL\>. If it's not verified yet, run the following command to verify it.

   ```sh
   make verify-will
   ```

3. Teansfer the tokens from the testator to the beneficiary.

   > Check
   >
   > ```sh
   > make check-balance-before
   > ```

   ```sh
   make signatureTransferToBeneficiaries
   ```

   > Check
   >
   > ```sh
   > make executed-after
   > ```
   >
   > ```sh
   > make check-balance-after
   > ```
