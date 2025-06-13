# Backend Usage Guide

This guide explains how to use the backend components of the Testament system for encrypting, uploading, and managing testament files.

## Prerequisites

1. **Environment Configuration**: Ensure the `.env` file is properly configured with all required variables.
2. **IPFS Daemon**: Start the IPFS daemon for file storage operations.

## Initialization

Reset environment variables and remove old testament files:

```sh
make init
```

## Phase 1: Encrypt & Upload Testament

### Step 1: Create Testament Content

Store the testament in [`testament/1_plaintext.txt`](testament/1_plaintext.txt).

The testament should contain:
- [ ] The testator's wallet address
- [ ] The beneficiary's wallet address (multiple beneficiaries support planned)
- [ ] ERC20 tokens and corresponding amounts to be transferred

**Example testament:**
```
After my death, I would like to transfer 5 USDC and 10 LINK to my son.
My wallet is 0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc.
My son's wallet 0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c.
```

### Step 2: Format Testament (In Development)

Format the plaintext testament into a JSON file:
- **Required `.env` fields**: None
- **Output**: [`testament/2_formatted.json`](testament/2_formatted.json)

*Note: This step is currently under development.*

### Step 3: Approve Permit2 Contract

One-time initialization to approve the Permit2 contract for the testator's tokens:

```sh
make approve-permit
```

- **Note**: If you've completed this approval before, you can skip to the next step.

### Step 4: Predict Testament Address

Generate the testament contract address based on the formatted testament:

```sh
make predict-address
```

- **Output**: [`testament/3_addressed.json`](testament/3_addressed.json)
- **Updates**: The following `.env` variables are automatically updated:
  - `SALT`, `TESTAMENT_ADDRESS`
  - `BENEFICIARY<ID>`, `TOKEN<ID>`, `AMOUNT<ID>`

### Step 5: Generate Permit2 Signature

Create the signature for [Permit2 SignatureTransfer function](https://docs.uniswap.org/contracts/permit2/reference/signature-transfer):

```sh
make generate-signature
```

- **Output**: [`testament/4_signed.json`](testament/4_signed.json)
- **Updates**: The following `.env` variables are automatically updated:
  - `NONCE`, `DEADLINE`, `PERMIT2_SIGNATURE`

### Step 6: Encrypt Testament

Encrypt the signed testament with a randomly generated secret key:

```sh
make encrypt-testament
```

- **Output**: [`testament/5_encrypted.json`](testament/5_encrypted.json) (base64 encoded)

### Step 7: Upload to IPFS

Upload the encrypted testament to IPFS:

```sh
make upload-testament
```

- **Updates**: The following `.env` variables are automatically updated:
  - `CID` (IPFS Content Identifier)

## Phase 2: Probation

### Step 1: Download and Decrypt

Download the testament from IPFS and decrypt it:

```sh
make download-and-decrypt-testament
```

- **Output**: [`testament/6_decrypted.json`](testament/6_decrypted.json)

### Step 2: Executor Signature

The executor signs the CID to authorize testament execution:

```sh
make sign-cid
```

- **Updates**: The `EXECUTOR_SIGNATURE` variable in `.env` is updated

## File Structure

The testament processing creates the following files in sequence:

```
testament/
├── 1_plaintext.txt      # Original testament content
├── 2_formatted.json     # Structured JSON format
├── 3_addressed.json     # Testament with contract address
├── 4_signed.json        # Testament with Permit2 signature
├── 5_encrypted.json     # Encrypted testament (base64)
└── 6_decrypted.json     # Decrypted testament for verification
```

## Environment Variables

The system automatically manages the following `.env` variables during the process:

### Estate Configuration
- `BENEFICIARY<ID>`: Beneficiary wallet addresses
- `TOKEN<ID>`: Token contract addresses
- `AMOUNT<ID>`: Transfer amounts

### Testament Lifecycle
- `SALT`: CREATE2 salt for contract deployment
- `TESTAMENT_ADDRESS`: Predicted contract address
- `NONCE`, `DEADLINE`: Permit2 parameters
- `PERMIT2_SIGNATURE`: Testator's authorization signature
- `CID`: IPFS storage identifiers
- `EXECUTOR_SIGNATURE`: Executor's authorization signature

## Troubleshooting

### Common Issues

1. **Permit2 Approval Fails**: You may have already approved the tokens. Check your transaction history or skip to the next step.

2. **IPFS Upload Fails**: Ensure your IPFS daemon is running and `PINATA_JWT` is correctly configured.

3. **Signature Generation Fails**: Verify that `TESTATOR_PRIVATE_KEY` is set correctly (without 0x prefix).

4. **Testament Address Prediction Fails**: Check that `TESTAMENT_FACTORY_ADDRESS` is deployed and accessible.

### Verification Commands

```sh
# Check if IPFS daemon is running
ipfs id

# Verify environment variables
echo $TESTAMENT_FACTORY_ADDRESS

# Check testament files
ls -la testament/
```