import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

const execAsync = promisify(exec);

interface TestInput {
  a: number | string;
  b: number | string;
}

interface ProofData {
  proof: any;
  publicSignals: string[];
}

describe("Multiplier2 Circuit Tests", () => {
  const circuitName = "multiplier2";
  const circuitDir = `circuits/${circuitName}`;
  const buildDir = `${circuitDir}/build`;
  const keysDir = `${circuitDir}/keys`;
  const proofsDir = `${circuitDir}/proofs`;
  const inputDir = `${circuitDir}/inputs`;

  // Circuit file paths
  const circuitFile = `${circuitDir}/${circuitName}.circom`;
  const r1csFile = `${buildDir}/${circuitName}.r1cs`;
  const wasmFile = `${buildDir}/${circuitName}_js/${circuitName}.wasm`;
  const symFile = `${buildDir}/${circuitName}.sym`;
  const zkeyFile = `${keysDir}/${circuitName}_final.zkey`;
  const vkeyFile = `${keysDir}/verification_key.json`;

  beforeAll(async () => {
    console.log("🔧 Setting up Multiplier2 circuit tests...");
    // Compile circuit
    await compileCircuit();
    
    // Setup trusted ceremony
    await setupTrustedCeremony();
    
    console.log("✅ Setup completed");
  }, 120000); // 2 minutes timeout

  async function compileCircuit() {
    console.log("🔨 Compiling circuit...");
    try {
      const { stdout, stderr } = await execAsync(
        `make compile CIRCUIT=${circuitName}`
      );
      if (stderr && !stderr.includes("Everything went okay")) {
        console.warn("Compilation warnings:", stderr);
      }
      console.log("✅ Circuit compiled successfully");
    } catch (error) {
      console.error("❌ Circuit compilation failed:", error);
      throw error;
    }
  }

  async function setupTrustedCeremony() {
    console.log("🔐 Setting up trusted ceremony...");
    
    // Download powers of tau (using smaller one for testing)
    const ptauFile = "circuits/shared/keys/downloaded/pot12_02.ptau";
    const ptauUrl =
      "https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/pot28_0080/ppot_0080_02.ptau";

    try {
      // Check if ptau file exists
      await fs.access(ptauFile);
    } catch {
      console.log("📥 Downloading powers of tau...");
      await execAsync(
        `wget -O ${ptauFile} ${ptauUrl}`
      ).catch(() => {
        // If wget fails, try curl
        return execAsync(`curl -o ${ptauFile} ${ptauUrl}`);
      });
    }

    // Setup circuit specific keys
    await execAsync(`snarkjs groth16 setup ${r1csFile} ${ptauFile} ${keysDir}/${circuitName}_0000.zkey`);
    
    // Phase 2 ceremony (simplified for testing)
    await execAsync(`snarkjs zkey new ${keysDir}/${circuitName}_0000.zkey ${zkeyFile} --name="test"`);
    
    // Export verification key
    await execAsync(`snarkjs zkey export verificationkey ${zkeyFile} ${vkeyFile}`);
    
    console.log("✅ Trusted ceremony completed");
  }

  describe("Circuit Compilation", () => {
    test("should have all compiled files", async () => {
      // Check R1CS file
      await expect(fs.access(r1csFile)).resolves.not.toThrow();
      
      // Check WASM file
      await expect(fs.access(wasmFile)).resolves.not.toThrow();
      
      // Check Symbol file
      await expect(fs.access(symFile)).resolves.not.toThrow();
      
      console.log("✅ All compilation files present");
    });

    test("should have correct circuit constraints", async () => {
      const { stdout } = await execAsync(`snarkjs info -r ${r1csFile}`);
      
      // Multiplier2 should have 1 constraint
      expect(stdout).toContain("# of Constraints: 1");
      expect(stdout).toContain("# of Wires: 4");
      
      console.log("Circuit info:", stdout);
    });
  });

  describe("Trusted Setup", () => {
    test("should have generated keys", async () => {
      await expect(fs.access(zkeyFile)).resolves.not.toThrow();
      await expect(fs.access(vkeyFile)).resolves.not.toThrow();
      
      console.log("✅ Trusted setup keys present");
    });

    test("should have valid verification key", async () => {
      const vkeyContent = await fs.readFile(vkeyFile, "utf-8");
      const vkey = JSON.parse(vkeyContent);
      
      expect(vkey).toHaveProperty("protocol");
      expect(vkey).toHaveProperty("curve");
      expect(vkey).toHaveProperty("nPublic");
      expect(vkey.nPublic).toBe(1); // Only output 'c'
      
      console.log("✅ Verification key is valid");
    });
  });

  describe("Witness Generation", () => {
    async function generateWitness(input: TestInput, witnessFile: string) {
      const inputFile = `${inputDir}/test_${Date.now()}.json`;
      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));
      
      await execAsync(
        `node ${buildDir}/${circuitName}_js/generate_witness.js ${wasmFile} ${inputFile} ${witnessFile}`
      );
      
      // Cleanup input file
      await fs.unlink(inputFile);
    }

    test("should generate witness for basic multiplication", async () => {
      const witnessFile = `${buildDir}/witness_basic.wtns`;
      const input = { a: 3, b: 11 };
      
      await generateWitness(input, witnessFile);
      
      // Verify witness satisfies constraints
      const { stdout } = await execAsync(`snarkjs wtns check ${r1csFile} ${witnessFile}`);
      expect(stdout.trim()).toBe("OK!");
      
      // Export and check witness values
      const witnessJsonFile = `${buildDir}/witness_basic.json`;
      await execAsync(`snarkjs wtns export json ${witnessFile} ${witnessJsonFile}`);
      
      const witnessData = JSON.parse(await fs.readFile(witnessJsonFile, "utf-8"));
      expect(witnessData[1]).toBe("33"); // a * b = 3 * 11 = 33
      
      console.log("✅ Basic witness generation successful");
    });

    test("should handle zero multiplication", async () => {
      const witnessFile = `${buildDir}/witness_zero.wtns`;
      const input = { a: 0, b: 5 };
      
      await generateWitness(input, witnessFile);
      
      const { stdout } = await execAsync(`snarkjs wtns check ${r1csFile} ${witnessFile}`);
      expect(stdout.trim()).toBe("OK!");
      
      const witnessJsonFile = `${buildDir}/witness_zero.json`;
      await execAsync(`snarkjs wtns export json ${witnessFile} ${witnessJsonFile}`);
      
      const witnessData = JSON.parse(await fs.readFile(witnessJsonFile, "utf-8"));
      expect(witnessData[1]).toBe("0");
      
      console.log("✅ Zero multiplication test passed");
    });

    test("should handle large numbers", async () => {
      const witnessFile = `${buildDir}/witness_large.wtns`;
      const input = { a: 12345, b: 67890 };
      
      await generateWitness(input, witnessFile);
      
      const { stdout } = await execAsync(`snarkjs wtns check ${r1csFile} ${witnessFile}`);
      expect(stdout.trim()).toBe("OK!");
      
      const witnessJsonFile = `${buildDir}/witness_large.json`;
      await execAsync(`snarkjs wtns export json ${witnessFile} ${witnessJsonFile}`);
      
      const witnessData = JSON.parse(await fs.readFile(witnessJsonFile, "utf-8"));
      expect(witnessData[1]).toBe((12345 * 67890).toString());
      
      console.log("✅ Large number multiplication test passed");
    });
  });

  describe("Proof Generation and Verification", () => {
    async function generateProof(input: TestInput): Promise<ProofData> {
      const inputFile = `${inputDir}/proof_input_${Date.now()}.json`;
      const witnessFile = `${buildDir}/witness_proof.wtns`;
      const proofFile = `${proofsDir}/proof_test.json`;
      const publicFile = `${proofsDir}/public_test.json`;
      
      // Write input
      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));
      
      // Generate witness
      await execAsync(
        `node ${buildDir}/${circuitName}_js/generate_witness.js ${wasmFile} ${inputFile} ${witnessFile}`
      );
      
      // Generate proof
      await execAsync(
        `snarkjs groth16 prove ${zkeyFile} ${witnessFile} ${proofFile} ${publicFile}`
      );
      
      // Read proof and public signals
      const proof = JSON.parse(await fs.readFile(proofFile, "utf-8"));
      const publicSignals = JSON.parse(await fs.readFile(publicFile, "utf-8"));
      
      // Cleanup
      await fs.unlink(inputFile);
      
      return { proof, publicSignals };
    }

    test("should generate and verify valid proof", async () => {
      const input = { a: 7, b: 8 };
      const { proof, publicSignals } = await generateProof(input);
      
      // Check public signals
      expect(publicSignals[0]).toBe("56"); // 7 * 8 = 56
      
      // Verify proof
      const proofFile = `${proofsDir}/proof_test.json`;
      const publicFile = `${proofsDir}/public_test.json`;
      
      const { stdout } = await execAsync(
        `snarkjs groth16 verify ${vkeyFile} ${publicFile} ${proofFile}`
      );
      
      expect(stdout.trim()).toBe("OK!");
      console.log("✅ Proof generation and verification successful");
    });

    test("should generate different proofs for different inputs", async () => {
      const input1 = { a: 2, b: 3 };
      const input2 = { a: 4, b: 5 };
      
      const proof1 = await generateProof(input1);
      const proof2 = await generateProof(input2);
      
      // Proofs should be different
      expect(proof1.proof).not.toEqual(proof2.proof);
      
      // But both should have correct outputs
      expect(proof1.publicSignals[0]).toBe("6");  // 2 * 3
      expect(proof2.publicSignals[0]).toBe("20"); // 4 * 5
      
      console.log("✅ Different inputs generate different proofs");
    });
  });

  describe("Solidity Verifier", () => {
    test("should generate Solidity verifier contract", async () => {
      const verifierFile = `${circuitDir}/contracts/verifier.sol`;
      
      await execAsync(`snarkjs zkey export solidityverifier ${zkeyFile} ${verifierFile}`);
      
      await expect(fs.access(verifierFile)).resolves.not.toThrow();
      
      const verifierContent = await fs.readFile(verifierFile, "utf-8");
      expect(verifierContent).toContain("contract Groth16Verifier");
      expect(verifierContent).toContain("function verifyProof");
      
      console.log("✅ Solidity verifier generated successfully");
    });
  });

//   describe("Error Handling", () => {
//     test("should fail with invalid constraints", async () => {
//       // Create a circuit with impossible constraints
//       const invalidCircuitCode = `pragma circom 2.0.0;

// template Invalid() {
//     signal input a;
//     signal output b;
    
//     // Impossible constraint: 1 === 0
//     1 === 0;
//     b <== a;
// }

// component main = Invalid();`;

//       const invalidCircuitFile = `${circuitDir}/invalid.circom`;
//       await fs.writeFile(invalidCircuitFile, invalidCircuitCode);
      
//       // This should fail during witness generation
//       await expect(
//         execAsync(`circom ${invalidCircuitFile} --r1cs --wasm -o ${buildDir}`)
//       ).rejects.toThrow();
      
//       console.log("✅ Invalid constraints properly rejected");
//     });

//     test("should handle missing input gracefully", async () => {
//       const nonExistentFile = `${inputDir}/nonexistent.json`;
//       const witnessFile = `${buildDir}/witness_error.wtns`;
      
//       await expect(
//         execAsync(
//           `node ${buildDir}/${circuitName}_js/generate_witness.js ${wasmFile} ${nonExistentFile} ${witnessFile}`
//         )
//       ).rejects.toThrow();
      
//       console.log("✅ Missing input file properly handled");
//     });
//   });

  // describe("Performance Tests", () => {
  //   test("should complete witness generation within time limit", async () => {
  //     const start = Date.now();
      
  //     const witnessFile = `${buildDir}/witness_perf.wtns`;
  //     const input = { a: 999999, b: 888888 };
      
  //     const inputFile = `${inputDir}/perf_test.json`;
  //     await fs.writeFile(inputFile, JSON.stringify(input, null, 2));
      
  //     await execAsync(
  //       `node ${buildDir}/${circuitName}_js/generate_witness.js ${wasmFile} ${inputFile} ${witnessFile}`
  //     );
      
  //     const duration = Date.now() - start;
  //     expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
  //     console.log(`✅ Witness generation completed in ${duration}ms`);
  //   });

  //   test("should complete proof generation within time limit", async () => {
  //     const start = Date.now();
      
  //     const input = { a: 42, b: 24 };
  //     await generateProof(input);
      
  //     const duration = Date.now() - start;
  //     expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
  //     console.log(`✅ Proof generation completed in ${duration}ms`);
  //   });
  // });

  afterAll(async () => {
    console.log("🧹 Cleaning up test files...");
    
    // Optional: Clean up generated files
    // Uncomment if you want to clean up after tests
    /*
    await fs.rm(buildDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(keysDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(proofsDir, { recursive: true, force: true }).catch(() => {});
    */
    
    console.log("✅ Cleanup completed");
  });
});