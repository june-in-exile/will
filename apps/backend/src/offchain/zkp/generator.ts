import type { Groth16Proof } from "@shared/types/index.js";
import { PATHS_CONFIG } from "@config";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";

const execAsync = promisify(exec);

interface ZkpGeneratorOptions<T> {
  circuitName: keyof typeof PATHS_CONFIG.zkp;
  input: T;
}

async function generateZkpProof<T>(
  options: ZkpGeneratorOptions<T>,
): Promise<Groth16Proof> {
  const { circuitName, input } = options;

  console.log(chalk.blue(`Generating proof for ${circuitName}`));

  const circuitFiles = PATHS_CONFIG.zkp[circuitName];

  try {
    // Create necessary directories
    await mkdir(dirname(circuitFiles.proof), { recursive: true });
    await mkdir(dirname(circuitFiles.public), { recursive: true });
    await mkdir(dirname(circuitFiles.input), { recursive: true });
    await mkdir(dirname(circuitFiles.witness), { recursive: true });

    // Write input file
    await writeFile(circuitFiles.input, JSON.stringify(input, null, 2));
    console.log(chalk.green(`✅ Input file created: ${circuitFiles.input}`));

    // Calculate witness
    console.log(chalk.blue("Calculating witness..."));
    await execAsync(
      `snarkjs wtns calculate ${circuitFiles.wasm} ${circuitFiles.input} ${circuitFiles.witness}`,
    );
    console.log(chalk.green("✅ Witness calculated"));

    // Generate proof
    console.log(chalk.blue("Generating proof..."));
    await execAsync(
      `snarkjs groth16 prove ${circuitFiles.zkey} ${circuitFiles.witness} ${circuitFiles.proof} ${circuitFiles.public}`,
    );
    console.log(chalk.green("✅ Proof generated"));

    // Read results
    const proofContent = await import(circuitFiles.proof, {
      assert: { type: "json" },
    });
    const publicContent = await import(circuitFiles.public, {
      assert: { type: "json" },
    });

    console.log(chalk.cyan(`📁 Proof file: ${circuitFiles.proof}`));
    console.log(chalk.cyan(`📁 Public signals file: ${circuitFiles.public}`));
    console.log(chalk.yellow(`🔍 Public output: ${publicContent.default}`));

    return {
      proof: proofContent.default,
      publicSignals: publicContent.default,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate ${circuitName} proof: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { generateZkpProof };
