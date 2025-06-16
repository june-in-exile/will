### Step-by-step example

1. Writing circuits.

    ``` circom
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

2. Compiling circuit.
   
    ``` sh
    circom multiplier2.circom --r1cs --wasm --sym --c
    ```

3. Computing the witness with **either** WebAssembly or C++ (deprecated)

    #### WebAssembly

    ``` sh
    cd multiplier2_js
    echo "{\"a\": \"3\", \"b\": \"11\"}" >> input.json
    snarkjs wtns calculate multiplier2.wasm input.json witness.wtns
    mv witness.wtns ..
    ```

    #### C++

    ``` sh
    cd multiplier2_cpp
    echo "{\"a\": \"3\", \"b\": \"11\"}" >> input.json
    make
    ./multiplier2 input.json witness.wtns
    mv witness.wtns ..
    ```

4. Trusted setup

    #### Powers of Tau

    ``` sh
    # Start a new  "powers of tau" ceremony:
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    # Contribute to the ceremony
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
    ```
    
    #### Phase 2 (circuit-specific)
    
    ``` sh
    # Start generation
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    # Generate proving and verification keys in .zkey
    snarkjs groth16 setup multiplier2.r1cs pot12_final.ptau multiplier2_0000.zkey
    # Contribute to the phase 2 of the ceremony
    snarkjs zkey contribute multiplier2_0000.zkey multiplier2_0001.zkey --name="1st Contributor Name" -v
    # Export the verification key
    snarkjs zkey export verificationkey multiplier2_0001.zkey verification_key.json
    ```

5. Proving circuits with ZK

    ``` sh
    # Generate a Proof
    snarkjs groth16 prove multiplier2_0001.zkey witness.wtns proof.json public.json
    # Verify the proof
    snarkjs groth16 verify verification_key.json public.json proof.json
    ```

6. Preparation for verifying onchain

    ``` sh
    # Generate the Solidity code
    snarkjs zkey export solidityverifier multiplier2_0001.zkey verifier.sol
    # Copy the Solidity code for depolyment
    cp verifier.sol ../contracts/src/Groth16Verifier.sol
    ```

7. Deploying the contract

    Refer to the [contracts](../contracts/) document for deployment.

8. Verifying onchain

    ``` sh
    snarkjs generatecall
    # Update the parameters in [contracts Makefile](../contracts/Makefile) accordingly
    ```

---

### Reference
- [Circom 2 Documentation](https://docs.circom.io/getting-started/installation/)