/*
 * Generate ZK Proof for multiplier2
 *
 * input:
 *  - private: a, b
 *  - public: c (= a * b)
 *
 * output:
 *  - proof.json in @zkp/circuits/multiplier2/proofs/proof.json
 *  - public.json in @zkp/circuits/multiplier2/proofs/public.json
 *
 * The proof.json proves the c in public.json is equal the product of two secret numbers
 */

import { PATHS_CONFIG } from "@config";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";

const execAsync = promisify(exec);

interface Multiplier2Input {
  a: number;
  b: number;
}

interface Groth16Proof {
  proof: object;
  publicSignals: string[];
}

async function generateMultiplier2Proof(input: Multiplier2Input): Promise<Groth16Proof> {
  const { a, b } = input;
  const c = a * b;

  console.log(chalk.blue(`Generating proof for a=${a}, b=${b}, c=${c}`));

  const circuitName = "multiplier2";
  const zkpBaseDir = "../../zkp";
  const circuitDir = `${zkpBaseDir}/circuits/${circuitName}`;
  const buildDir = `${circuitDir}/build`;
  const inputsDir = `${circuitDir}/inputs`;
  const keysDir = `${circuitDir}/keys`;
  // const proofsDir = `${circuitDir}/proofs`;

  const wasmFile = `${buildDir}/${circuitName}_js/${circuitName}.wasm`;
  const zkeyFile = `${keysDir}/${circuitName}_0001.zkey`;
  const inputFile = `${inputsDir}/input.json`;
  const witnessFile = `${buildDir}/witness.wtns`;
  const proofFile = PATHS_CONFIG.zkp.multiplier2.proof;
  const publicFile = PATHS_CONFIG.zkp.multiplier2.public;

  try {
    await mkdir(dirname(proofFile), { recursive: true });
    await mkdir(dirname(publicFile), { recursive: true });
    await mkdir(dirname(inputFile), { recursive: true });
    await mkdir(dirname(witnessFile), { recursive: true });

    await writeFile(inputFile, JSON.stringify({ a, b }, null, 2));
    console.log(chalk.green(`✅ Input file created: ${inputFile}`));

    console.log(chalk.blue("Calculating witness..."));
    await execAsync(`snarkjs wtns calculate ${wasmFile} ${inputFile} ${witnessFile}`);
    console.log(chalk.green("✅ Witness calculated"));

    console.log(chalk.blue("Generating proof..."));
    await execAsync(`snarkjs groth16 prove ${zkeyFile} ${witnessFile} ${proofFile} ${publicFile}`);
    console.log(chalk.green("✅ Proof generated"));

    const proofContent = await import(proofFile, { assert: { type: "json" } });
    const publicContent = await import(publicFile, { assert: { type: "json" } });

    console.log(chalk.green(`✅ Proof generation completed successfully`));
    console.log(chalk.cyan(`📁 Proof file: ${proofFile}`));
    console.log(chalk.cyan(`📁 Public signals file: ${publicFile}`));
    console.log(chalk.yellow(`🔍 Public output: ${publicContent.default[0]}`));

    return {
      proof: proofContent.default,
      publicSignals: publicContent.default
    };

  } catch (error) {
    throw new Error(
      `Failed to generate multiplier2 proof: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== Generating Multiplier2 Zero Knowledge Proof ===\n")
    );

    const input: Multiplier2Input = { a: 3, b: 11 };

    const result = await generateMultiplier2Proof(input);

    const expectedOutput = input.a * input.b;
    const actualOutput = parseInt(result.publicSignals[0]);

    if (actualOutput === expectedOutput) {
      console.log(chalk.green(`✅ Proof verification: Expected ${expectedOutput}, got ${actualOutput}`));
    } else {
      console.log(chalk.red(`❌ Proof verification failed: Expected ${expectedOutput}, got ${actualOutput}`));
    }

    console.log(chalk.green("\n✅ Successfully generated multiplier2 proof."));
  } catch (error) {
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error"
    );
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error: Error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  });
}
