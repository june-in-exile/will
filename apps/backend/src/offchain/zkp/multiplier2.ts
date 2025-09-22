import { PATHS_CONFIG } from "@config";
import type { Groth16Proof, Multiplier2Input } from "@shared/types/index.js";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";

const execAsync = promisify(exec);

async function generateMultiplier2Proof(input: Multiplier2Input): Promise<Groth16Proof> {
  const { a, b } = input;
  const c = a * b;

  console.log(chalk.blue(`Generating proof for a=${a}, b=${b}, c=${c}`));
  
  const files = PATHS_CONFIG.zkp.multiplier2;

  try {
    await mkdir(dirname(files.proof), { recursive: true });
    await mkdir(dirname(files.public), { recursive: true });
    await mkdir(dirname(files.input), { recursive: true });
    await mkdir(dirname(files.witness), { recursive: true });

    await writeFile(files.input, JSON.stringify({ a, b }, null, 2));
    console.log(chalk.green(`✅ Input file created: ${files.input}`));

    console.log(chalk.blue("Calculating witness..."));
    await execAsync(`snarkjs wtns calculate ${files.wasm} ${files.input} ${files.witness}`);
    console.log(chalk.green("✅ Witness calculated"));

    console.log(chalk.blue("Generating proof..."));
    await execAsync(`snarkjs groth16 prove ${files.zkey} ${files.witness} ${files.proof} ${files.public}`);
    console.log(chalk.green("✅ Proof generated"));

    const proofContent = await import(files.proof, { assert: { type: "json" } });
    const publicContent = await import(files.public, { assert: { type: "json" } });

    console.log(chalk.cyan(`📁 Proof file: ${files.proof}`));
    console.log(chalk.cyan(`📁 Public signals file: ${files.public}`));
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

async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== Generating Multiplier2 Zero Knowledge Proof ===\n")
    );

    const input: Multiplier2Input = {
      a: Math.floor(Math.random() * 100),
      b: Math.floor(Math.random() * 100)
    };

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

export { generateMultiplier2Proof };