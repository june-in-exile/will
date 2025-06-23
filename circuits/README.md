### Step-by-step example

1. Writing circuits.

   ```circom
   // multiplier2.circom

   pragma circom 2.0.0;

   template Multiplier2() {
       signal input a;
       signal input b;
       signal output c;
       c <== a*b;
   }

   component main = Multiplier2();
   ```

2. **Quick Start with Makefile**

   To run the complete workflow automatically:
   ```sh
   make all
   ```

   Or run individual steps:
   ```sh
   make compile
   make witness
   make trusted_setup_general
   make trusted_setup_specific
   make prove
   make verify
   make solidity
   make generate_call
   ```

   To clean up generated files:
   ```sh
   make clean
   ```

3. **Manual Step-by-step Process**

   #### Compiling circuit

   ```sh
   circom multiplier2.circom --r1cs --wasm --sym
   ```

   #### Computing the witness with WebAssembly

   ```sh
   # Create input file with timestamp
   echo "{\"a\": \"3\", \"b\": \"11\"}" > input_$(date +%Y%m%d_%H%M%S).json
   
   # Calculate witness
   cd multiplier2_js
   snarkjs wtns calculate multiplier2.wasm ../input_*.json ../witness.wtns
   ```

4. **Trusted setup**

   #### Powers of Tau (General Setup)

   ```sh
   # Start a new "powers of tau" ceremony:
   snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
   # Contribute to the ceremony
   snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
   ```

   #### Phase 2 (Circuit-specific Setup)

   ```sh
   # Prepare phase 2
   snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
   # Generate proving and verification keys in .zkey
   snarkjs groth16 setup multiplier2.r1cs pot12_final.ptau multiplier2_0000.zkey
   # Contribute to the phase 2 of the ceremony
   snarkjs zkey contribute multiplier2_0000.zkey multiplier2_0001.zkey --name="1st Contributor Name" -v
   # Export the verification key
   snarkjs zkey export verificationkey multiplier2_0001.zkey verification_key.json
   ```

5. **Proving circuits with ZK**

   ```sh
   # Generate a Proof
   snarkjs groth16 prove multiplier2_0001.zkey witness.wtns proof.json public.json
   # Verify the proof
   snarkjs groth16 verify verification_key.json public.json proof.json
   ```

6. **Preparation for verifying onchain**

   ```sh
   # Generate the Solidity code
   snarkjs zkey export solidityverifier multiplier2_0001.zkey ../contracts/src/Groth16Verifier.sol
   ```

7. **Deploying the contract**

   Refer to the [../contracts](../contracts/) document for deployment.

8. **Verifying onchain**

   ```sh
   snarkjs generatecall
   # Update the parameters in [contracts Makefile](../contracts/Makefile) accordingly
   ```

---

### Makefile Configuration

The Makefile uses the `CIRCUIT` variable to specify which circuit to work with:

```makefile
CIRCUIT=multiplier2
```

To use a different circuit, simply change this variable or override it:

```sh
make all CIRCUIT=your_circuit_name
```

### Generated Files

The workflow generates the following files:
- `input_YYYYMMDD_HHMMSS.json` - Input file with timestamp
- `multiplier2.r1cs` - R1CS constraint system
- `multiplier2.wasm` - WebAssembly compiled circuit
- `multiplier2.sym` - Symbol file
- `witness.wtns` - Witness file
- `proof.json` - ZK proof
- `public.json` - Public signals
- `verification_key.json` - Verification key
- `pot12_*.ptau` - Powers of tau files
- `multiplier2_*.zkey` - Circuit-specific keys
- `../contracts/src/Groth16Verifier.sol` - Solidity verifier contract

---

### Reference

- [Circom 2 Documentation](https://docs.circom.io/getting-started/installation/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)