# How to use?

## Initialization

1. Reset [foundry's](../foundry/.env) environment variables and remove the old testament files.

   ``` sh
   make init
   ```

2. Start the IPFS daemon.

## Phase1: Encrypt & Upload Testament

1. Store the testamnet in [`testament/1_plaintext.txt`](testament/1_plaintext.txt).
   - The testament is a `.txt` file that contains the following information:
     - [ ] The wallet of the testator.
     - [ ] The wallet of the beneficiary (Multiple beneficiaries should be allowed in the future).
     - [ ] The ERC20 tokens and the corresponding amounts to be transferred.
   - Example testament:
      > After my death, I would like to transfer 5 USDC and 10 LINK to my son.
      > My wallet is 0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc.
      > My son's wallet 0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c.
   
2. Format the plaintext testament into a JSON file (**This part is not complete yet.)**
   - Required `.env` filed: none.
   - The result is stored in [`testament/2_formatted.json`](testament/2_formatted.json).

3. One time "initialization" step to approve Permit2 contract for testator's token.
   - Required `.env` filed: `ARB_SEPOLIA_RPC_URL`.
   - If you have finished the approval before, this step might fail and you can just skip to the next step.

   ``` sh
   make approve-permit
   ```
   
4. Predict the testament address according to formatted testament.
   - Required `.env` filed: `ARB_SEPOLIA_RPC_URL`, [foundry's](../foundry/.env) `TESTAMENT_FACTORY_ADDRESS`.
   - The result is stored in [`testament/3_addressed.json`](testament/3_addressed.json).
   - The `BENEFICIARY0`, `TOKEN0`, `AMOUNT0`, `BENEFICIARY1`, `TOKEN1`, `AMOUNT1`, `SALT` and `TESTAMENT_ADDRESS` in [foundry's](../foundry/.env) `.env` file are updated.

   ```
   make predict-address
   ```
   
5. Generate the signature for [permit2 SignatureTransfer function](https://docs.uniswap.org/contracts/permit2/reference/signature-transfer).
   - Required `.env` filed: `ARB_SEPOLIA_RPC_URL`, `TESTATOR_PRIVATE_KEY`.
   - The result is stored in [`testament/4_signed.json`](testament/4_signed.json).
   - The `NONCE`, `DEADLINE` and `TESTATOR_SIGNATURE` in [foundry's](../foundry/.env) `.env` file are updated.

   ```
   make generate-signature
   ```

6. Encrypt the signed testament with a random secret key.
   - Required `.env` filed: none.
   - The result is encoded with base64 and stored in [`testament/5_encrypted.json`](testament/5_encrypted.json).

   ```
   make encrypt-testament
   ```

7. Upload the enypted testament to IPFS.
   - Required `.env` filed: none.
   - The `CID` in [backend's](./.env) and [foundry's](../foundry/.env) `.env` file are updated.
   - The `CID_HASH` in [foundry's](../foundry/.env) `.env` file is updated.

   ```
   make upload-testament
   ```

## Phase2: Probation

1. Download the testament from IPFS and decrypted it.
   - Required `.env` filed: `CID`.
   - The result is stored in [`testament/6_decrypted.json`](testament/6_decrypted.json).

   ```
   make download-and-decrypt-testament
   ```

2. The executor signs the cid.
   - Required `.env` filed: `CID`, `EXECUTOR`, `EXECUTOR_PRIVATE_KEY`.
   - The `EXECUTOR_SIGNATURE` in [foundry's](../foundry/.env) `.env` file is updated.

   ```
   make sign-cid
   ```