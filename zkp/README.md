# Zero-Knowledge Proof Circuits

This directory contains multiple Circom circuit implementations, supporting a complete ZK-SNARK workflow from circuit compilation to smart contract deployment.

## Prerequisites

```bash
# Install circom
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source ~/.cargo/env
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Install Node.js (v18+ recommended)
```

## Quick Start

### Install Dependencies

```bash
npm install
```

### Setup Powers of Tau (shared across all circuits)

```bash
# Download existing Powers of Tau (recommended)
make trusted-setup-phase1-download

# Or generate new Powers of Tau
make trusted-setup-phase1
```

### Run the Demo

Run the complete workflow using the default circuit (`multiplier2`):

```bash
make circuit
```

Or run individual steps:

```bash
make compile                    # Compile Circuit
make witness                    # Generate Witness
make trusted-setup-pahse2       # Circuit-Specific Trusted Setup
make prove                      # Generate Proof
make verify                     # Verify Proof
make solidity                   # Generate Solidity Verifier Contract
make generate-call              # Generate Smart Contract Call Parameters
```

### For Specific Circuits

Run the workflow for different circuits:

```bash
make <command> CIRCUIT=createWill
make <command> CIRCUIT=uploadCid
```

### Clean Up

```bash
# Clean current circuit
make clean

# Clean all circuits
make clean-all
```

## Workflow Explanation

### 1. Trusted Setup Phase

#### Powers of Tau (General Setup)

```bash
# Generate powers of tau
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau

# Or download existing powers of tau:
# https://github.com/privacy-scaling-explorations/perpetualpowersoftau
```

#### Circuit-Specific Setup

```bash
# Generate circuit keys
snarkjs groth16 setup circuit.r1cs pot12_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey
snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
```

### 2. Proof Generation Phase

```bash
# Calculate witness
snarkjs wtns calculate circuit.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove circuit_0001.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

### 3. Smart Contract Deployment Preparation

```bash
# Generate Solidity verifier contract
snarkjs zkey export solidityverifier circuit_0001.zkey verifier.sol

# Generate contract call parameters
snarkjs generatecall public.json proof.json
```

## Generated Files

### Compilation Artifacts

- `<circuit>.r1cs` - R1CS constraint system
- `<circuit>.wasm` - WebAssembly compiled circuit
- `<circuit>.sym` - Symbol file
- `<circuit>_js/` - JavaScript witness generator

### Key Files

- `<ptau>.ptau` - Powers of Tau (shared)
- `<circuit>_0000.zkey` - Initial circuit key
- `<circuit>_0001.zkey` - Final circuit key
- `verification_key.json` - Verification key

### Proof Related

- `witness.wtns` - Witness file
- `proof.json` - ZK proof
- `public.json` - Public signals

### Input/Output

- `example.json` - Input example
- `verifier.sol` - Solidity verifier contract

## Multi-Circuit Management

### Currently Available Circuits

- `multiplier2` - Multiplier example circuit
- `uploadCid` - CID upload circuit
- `createWill` - Will creation circuit

### Switch Circuits

```bash
# Method 1: Modify CIRCUIT variable in Makefile
CIRCUIT ?= createWill

# Method 2: Override on command line
make circuit CIRCUIT=createWill
```

### Adding New Circuits

1. Create a new directory under `circuits/`
2. Add the `.circom` circuit file
3. Add the `inputs/example.json` input file
4. Run the workflow using Makefile:

   ```bash
   make circuit CIRCUIT=your_new_circuit
   ```

## References

### Zero-Knowledge Proof

- [Circom 2 Documentation](https://docs.circom.io/getting-started/installation/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Groth16 Protocol](https://eprint.iacr.org/2016/260.pdf)
- [Powers of Tau Ceremony](https://github.com/privacy-scaling-explorations/perpetualpowersoftau)

### AES-256-GCM

- [NIST FIPS 197](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf)
- [NIST SP 800-38A](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf)
- [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)

## Common Errors for Development

1. Output not defined.

   ```
    RUNS  tests/utf8Encoder.test.ts
   will/zkp/node_modules/circom_tester/common/tester.js:264
                     throw new Error("Output variable not defined: " + prefix);
                           ^

   Error: Output variable not defined: main.length[0]
   ```

   Reason: forget to add `await` before `circuit.expectPass()` / `circuit.expectFail()`

   ```
   // incorrect
   circuit.expectPass({ codepoint: testCase.codepoint }, utf8ByteLength(testCase.codepoint));

   // correct
   await circuit.expectPass({ codepoint: testCase.codepoint }, utf8ByteLength(testCase.codepoint));
   ```

2. The number of template input signals must coincide with the number of input parameters.

   ```
    error[TAC01]: The number of template input signals must coincide with the number of input parameters
        ┌─ "will/zkp/circuits/shared/components/utf8Encoder.circom":188:23
        │
    188 │     validBytes[2] <== IsEqual()(length[1],1);
        │                       ^^^^^^^^^^^^^^^^^^^^^^ This is the anonymous component whose use is not allowed

    previous errors were found
   ```

   Reason: should input array

   ```
   validBytes[2] <== IsEqual()([length[1],1]);
   ```
