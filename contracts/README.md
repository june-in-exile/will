# How to use?

## Configuration

### Arbitrum Sepolia
   
1. Set `USE_ANVIL=false` in [`.env`](../.env.example).

### Forked Arbitrum Sepolia
   
1. Fork the Arbitrum Sepolia network.

    ``` sh
    make fork
    ```

    Open a new terminal and run the following commands.

2. Set `USE_ANVIL=true` in [`.env`](../.env.example).

## Initialization

1. Build the contracts, generate TypeScript types, etc.

    ``` sh
    make init
    ```

2. Deploy `Groth16Verifier.sol`.

    Check the deployment

    ``` sh
    make groth16verify_on_chain
    ```

    If it returns `true`, skip the deployment. Otherwise, execute the instruction and update `PERMIT2_VERIFIER_ADDRESS` and `DECRYPTION_VERIFIER_ADDRESS` in `.env`.

    ``` sh
    make deploy_groth16verifier
    ```

3. Deploy `TestamentFactory.sol`.

    Check the deployment

    > ``` sh
    > make testatorVerifier
    > make decryptionVerifier
    > make executor
    > ```
   
   If it returns the expected value, skip the deployment. Otherwise, ensure that the `PERMIT2_VERIFIER_ADDRESS`, `DECRYPTION_VERIFIER_ADDRESS` in the `.env` are set. Then, execute the instruction and update `TESTAMENT_FACTORY_ADDRESS` in `.env`.

    ``` sh
    make deploy_testamentFactory
    ```

## Execution

### Phase1: Encrypt & Upload Testament

1. Follow the [backend's](../apps/backend/) "Phase1: Encrypt & Upload Testament" instructions to predict the address, generate the signature, encrypt the testament, and upload it to IPFS.

2. Upload the `CID` to the TestamentFactory contract.

    ``` sh
    make uploadCID
    ```

    > Check
    > ``` sh
    > make testatorValidateTime
    > ```

### Phase2: Probation

1. Follow the [backend's](../apps/backend/) "Phase2: Probation" instructions to doownload the testament from the IPFS, decrypt it, and sign the cid as the executor.

2. Notarize the `CID` in the TestamentFactory contract.
    
    ``` sh
    make notarizeCID
    ```

    > Check
    > ``` sh
    > make executorValidateTime
    > ```

### Phase3: Decrypt & Execute Testament

1. Deploy `Testament.sol`.

    ``` sh
    make createTestament
    ```

    > Check
    > ``` sh
    > make permit2
    > make testament
    > make testator
    > make estate0
    > make estate1
    > make executed_before
    > ```

2. (Arbitrum Sepolia only) Verify `Testament.sol`.

    Check the contract on https://sepolia.arbiscan.io/address/<TESTAMENT_ADDRESS>. If it's not verified yet, run the following command to verify it.

    ``` sh
    make verify_testament
    ```

3. Teansfer the tokens from the testator to the beneficiary.

    > Check
    > ``` sh
    > make check_balance_before
    > ```
    
    ``` sh
    make signatureTransferToBeneficiaries
    ```

    > Check
    > ``` sh
    > make executed_after
    > ```
    > 
    > ``` sh
    > make check_balance_after
    > ```