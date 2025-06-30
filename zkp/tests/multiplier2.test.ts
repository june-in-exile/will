import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

describe("Multiplier2 Circuit Tests", () => {
  const circuitName = "multiplier2";
  const circuitDir = `circuits/${circuitName}`;

  beforeAll(async () => {
    // Ensure circuit is compiled before tests
    try {
      await execAsync(`make CIRCUIT=${circuitName} compile`);
    } catch (error) {
      console.warn("Circuit compilation failed, tests may fail");
    }
  }, 60000);

  describe("Circuit Compilation", () => {
    test("should have compiled circuit files", async () => {
      const r1csPath = `${circuitDir}/build/${circuitName}.r1cs`;
      const wasmPath = `${circuitDir}/build/${circuitName}_js/${circuitName}.wasm`;
      const symPath = `${circuitDir}/build/${circuitName}.sym`;

      await expect(fs.access(r1csPath)).resolves.not.toThrow();
      await expect(fs.access(wasmPath)).resolves.not.toThrow();
      await expect(fs.access(symPath)).resolves.not.toThrow();
    });
  });

  describe("Circuit Setup", () => {
    test("should setup circuit completely", async () => {
      const { stdout } = await execAsync(`make CIRCUIT=${circuitName} circuit`);

      expect(stdout).toContain("✅");

      // Check that all required files exist
      const requiredFiles = [
        `${circuitDir}/build/${circuitName}.r1cs`,
        `${circuitDir}/keys/verification_key.json`,
        `${circuitDir}/contracts/verifier.sol`,
        `${circuitDir}/proofs/proof.json`,
      ];

      for (const file of requiredFiles) {
        await expect(fs.access(file)).resolves.not.toThrow();
      }
    }, 180000); // 3 minute timeout for full setup
  });

  describe("Proof Generation and Verification", () => {
    beforeEach(async () => {
      // Ensure circuit is fully setup
      await execAsync(`make CIRCUIT=${circuitName} trusted-setup-specific`);
    }, 120000);

    test("should generate valid proof with default input", async () => {
      // Generate proof using Makefile
      const { stdout: proveOutput } = await execAsync(
        `make CIRCUIT=${circuitName} prove`,
      );
      expect(proveOutput).toContain("✅");

      // Verify proof using Makefile
      const { stdout: verifyOutput } = await execAsync(
        `make CIRCUIT=${circuitName} verify`,
      );
      expect(verifyOutput).toContain("OK");
    }, 60000);

    test("should generate correct output for 3 * 11", async () => {
      // Check the public signals in the generated proof
      const publicPath = `${circuitDir}/proofs/public.json`;
      const publicData = JSON.parse(await fs.readFile(publicPath, "utf-8"));

      // For multiplier2 with default input {"a": "3", "b": "11"}
      expect(publicData[0]).toBe("33");
    });

    test("should generate Solidity verifier", async () => {
      await execAsync(`make CIRCUIT=${circuitName} solidity`);

      const verifierPath = `${circuitDir}/contracts/verifier.sol`;
      await expect(fs.access(verifierPath)).resolves.not.toThrow();

      const verifierContent = await fs.readFile(verifierPath, "utf-8");
      expect(verifierContent).toContain("contract Groth16Verifier");
    });
  });

  describe("Custom Input Tests", () => {
    test("should work with custom input", async () => {
      // Create custom input
      const customInput = { a: "7", b: "6" };
      const inputPath = `${circuitDir}/input/custom.json`;

      await fs.writeFile(inputPath, JSON.stringify(customInput, null, 2));

      // Generate witness with custom input
      await execAsync(
        `snarkjs wtns calculate ${circuitDir}/build/${circuitName}_js/${circuitName}.wasm ${inputPath} ${circuitDir}/build/witness_custom.wtns`,
      );

      // Generate proof with custom witness
      await execAsync(
        `snarkjs groth16 prove ${circuitDir}/keys/${circuitName}_0001.zkey ${circuitDir}/build/witness_custom.wtns ${circuitDir}/proofs/proof_custom.json ${circuitDir}/proofs/public_custom.json`,
      );

      // Verify the result
      const publicData = JSON.parse(
        await fs.readFile(`${circuitDir}/proofs/public_custom.json`, "utf-8"),
      );
      expect(publicData[0]).toBe("42"); // 7 * 6 = 42
    }, 60000);
  });

  describe("Error Handling", () => {
    test("should handle missing input file gracefully", async () => {
      // Remove input file temporarily
      const inputPath = `${circuitDir}/input/example.json`;
      const backupPath = `${circuitDir}/input/example.json.bak`;

      try {
        await fs.rename(inputPath, backupPath);

        // Try to generate witness without input file
        await expect(
          execAsync(`make CIRCUIT=${circuitName} witness`),
        ).rejects.toThrow();
      } finally {
        // Restore input file
        await fs.rename(backupPath, inputPath).catch(() => {});
      }
    });
  });

  afterAll(async () => {
    // Optional: Clean up test artifacts
    // await execAsync(`make clean-circuit CIRCUIT=${circuitName}`);
  });
});
