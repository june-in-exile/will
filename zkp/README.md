# Zero-Knowledge Proof Circuits

This directory contains multiple Circom circuit implementations, supporting a complete ZK-SNARK workflow from circuit compilation to smart contract deployment.

## Quick Start

### Install Dependencies

```bash
npm install
```

### Complete Workflow

Run the complete workflow using the default circuit (`multiplier2`):

```bash
make all
```

Or run individual steps:

```bash
make compile
make input-example
make witness
make trusted-setup-general
make trusted-setup-specific
make prove
make verify
make solidity
make generate-call
```

To clean up generated files:

```bash
make clean
```

### For Specific Circuits

Run the workflow for different circuits:

```bash
make all CIRCUIT=createWill
make all CIRCUIT=uploadCid
```

## Detailed Usage

### 1. Circuit Examples

#### multiplier2.circom (Multiplier Circuit)

```circom
pragma circom 2.0.0;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;
    c <== a*b;
}

component main = Multiplier2();
```

### 2. Step-by-step Execution

#### Compile Circuit

```bash
make compile
# Or specify a circuit
make compile CIRCUIT=createWill
```

#### Prepare Input Data

```bash
make input-example
# Generates example input: circuits/multiplier2/input/example.json
```

#### Generate Witness

```bash
make witness
```

#### Trusted Setup

```bash
# General setup (Powers of Tau)
make trusted-setup-general

# Circuit-specific setup
make trusted-setup-specific
```

#### Generate and Verify Proof

```bash
# Generate proof
make prove

# Verify proof
make verify
```

#### Generate Solidity Verifier Contract

```bash
make solidity
```

#### Generate Smart Contract Call Parameters

```bash
make generate-call
```

### 3. Cleanup Operations

#### Clean All Circuits

```bash
make clean
```

#### Clean Current Circuit

```bash
make clean-circuit
```

#### Clean Specific Circuit

```bash
make clean-multiplier2
make clean-createWill
make clean-uploadCid
```

## Workflow Explanation

### 1. Trusted Setup Phase

#### Powers of Tau (General Setup)

```bash
# Automatically executes the following steps:
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau
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

- `multiplier2.r1cs` - R1CS constraint system
- `multiplier2.wasm` - WebAssembly compiled circuit
- `multiplier2.sym` - Symbol file
- `multiplier2_js/` - JavaScript witness generator

### Key Files

- `pot12_final.ptau` - Powers of Tau (shared)
- `multiplier2_0000.zkey` - Initial circuit key
- `multiplier2_0001.zkey` - Final circuit key
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
- `createWill` - Will creation circuit
- `uploadCid` - CID upload circuit

### Switch Circuits

```bash
# Method 1: Modify CIRCUIT variable in Makefile
CIRCUIT = createWill

# Method 2: Override on command line
make compile CIRCUIT=uploadCid
make all CIRCUIT=createWill
```

### Adding New Circuits

1. Create a new directory under `circuits/`
2. Add the `.circom` circuit file
3. Run the workflow using Makefile:

   ```bash
   make all CIRCUIT=your_new_circuit
   ```

## References

- [Circom 2 Documentation](https://docs.circom.io/getting-started/installation/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Groth16 Protocol](https://eprint.iacr.org/2016/260.pdf)
- [Powers of Tau Ceremony](https://github.com/privacy-scaling-explorations/perpetualpowersoftau)
