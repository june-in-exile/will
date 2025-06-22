# Backend Usage Guide

This guide explains how to use the backend components of the Will system for encrypting, uploading, and managing will files.

## Prerequisites

1. **Environment Configuration**: Ensure the `.env` file is properly configured with all required variables.
2. **IPFS Daemon**: Start the IPFS daemon for file storage operations.

## Initialization

Reset environment variables and remove old will files:

```sh
make clean
```

## Phase 1: Encrypt & Upload Will

### Step 1: Create Will Content

Store the will in [`will/1_plaintext.txt`](will/1_plaintext.txt).

The will should contain:

- [ ] The testator's wallet address
- [ ] The beneficiary's wallet address (multiple beneficiaries support planned)
- [ ] ERC20 tokens and corresponding amounts to be transferred

**Example will:**

```
After my death, I would like to transfer 5 USDC and 10 LINK to my son.
My wallet is 0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc.
My son's wallet 0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c.
```

### Step 2: Format Will (In Development)

Format the plaintext will into a JSON file:

- **Required `.env` fields**: None
- **Output**: [`will/2_formatted.json`](will/2_formatted.json)

_Note: This step is currently under development._

### Step 3: Approve Permit2 Contract

One-time initialization to approve the Permit2 contract for the testator's tokens:

```sh
make approve-permit
```

- **Note**: If you've completed this approval before, you can skip to the next step.

### Step 4: Predict Will Address

Generate the will contract address based on the formatted will:

```sh
make predict-address
```

- **Output**: [`will/3_addressed.json`](will/3_addressed.json)
- **Updates**: The following `.env` variables are automatically updated:
  - `SALT`, `WILL`
  - `BENEFICIARY<ID>`, `TOKEN<ID>`, `AMOUNT<ID>`

### Step 5: Generate Permit2 Signature

Create the signature for [Permit2 SignatureTransfer function](https://docs.uniswap.org/contracts/permit2/reference/signature-transfer):

```sh
make generate-signature
```

- **Output**: [`will/4_signed.json`](will/4_signed.json)
- **Updates**: The following `.env` variables are automatically updated:
  - `NONCE`, `DEADLINE`, `PERMIT2_SIGNATURE`

### Step 6: Encrypt Will

Encrypt the signed will with a randomly generated secret key:

```sh
make encrypt-will
```

- **Output**: [`will/5_encrypted.json`](will/5_encrypted.json) (base64 encoded)

### Step 7: Upload to IPFS

Upload the encrypted will to IPFS:

```sh
make upload-will
```

- **Updates**: The following `.env` variables are automatically updated:
  - `CID` (IPFS Content Identifier)

### Step 8: Upload CID

Upload the CID to `willFactory.sol`:

```sh
make upload-cid
```

- **Updates**: The following `.env` variables are automatically updated:
  - `UPLOAD_TX_HASH`, `UPLOAD_TIMESTAMP`


## Phase 2: Probation

### Step 1: Download and Decrypt

Download the will from IPFS and decrypt it:

```sh
make download-and-decrypt-will
```

- **Output**: [`will/6_decrypted.json`](will/6_decrypted.json)

### Step 2: Executor Signature

The executor signs the CID to authorize will execution:

```sh
make sign-cid
```

- **Updates**: The following `.env` variables are automatically updated:
  - `EXECUTOR_SIGNATURE`

### Step 3: Notarize CID

The exeutor notarize the CID on `willFactory.sol`:

```sh
make notarize-cid
```

- **Updates**: The following `.env` variables are automatically updated:
  - `NOTARIZE_TX_HASH`, `NOTARIZE_TIMESTAMP`


## Phase 3: Decrypt & Execute Will

### Step 1: Create Will

The exeutor create a new `Will.sol` through the `willFactory.sol`:

```sh
make create-will
```

- **Updates**: The following `.env` variables are automatically updated:
  - `CREATE_WILL_TX_HASH`, `CREATE_WILL_TIMESTAMP`

### Step 2: Transfer Estates

The exeutor executes the `Will.sol` and transfer the estates from the testator to the beneifciaries:

```sh
make signature-transfer
```

- **Updates**: The following `.env` variables are automatically updated:
  - `EXECUTE_WILL_TX_HASH`, `EXECUTE_WILL_TIMESTAMP`


## File Structure

The will processing creates the following files in sequence:

```
will/
├── 1_plaintext.txt      # Original will content
├── 2_formatted.json     # Structured JSON format
├── 3_addressed.json     # Will with contract address
├── 4_signed.json        # Will with Permit2 signature
├── 5_encrypted.json     # Encrypted will (base64)
└── 6_decrypted.json     # Decrypted will for verification
```