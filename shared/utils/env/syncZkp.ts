import { PATHS_CONFIG } from "../../config"
import { updateEnvVariable } from ".";
import { readProof } from "../read";
import { bigintArrayToEnvString } from "../format";
import { ProofData } from "../../types/crypto";
import { mkdir, copyFile } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";

async function updateEnvironmentVariables(proof: ProofData): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["PA_ARRAY", bigintArrayToEnvString(proof.pA)],
      ["PB_ARRAY", bigintArrayToEnvString(proof.pB)],
      ["PC_ARRAY", bigintArrayToEnvString(proof.pC)],
      ["PUBSIGNALS_ARRAY", bigintArrayToEnvString(proof.pubSignals)],
    ];

    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value))
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update environment variables: ${errorMessage}`);
  }
}

async function copyVerifierContract(): Promise<void> {
  try {
    console.log(chalk.blue("Copying verifier contract..."));

    const sourcePath = PATHS_CONFIG.zkp.multiplier2.verifier;
    const destPath = PATHS_CONFIG.contracts.groth16Verifier;

    const destDir = dirname(destPath);
    await mkdir(destDir, { recursive: true });

    await copyFile(sourcePath, destPath);

    console.log(chalk.green(`✅ Verifier contract copied from ${sourcePath} to ${destPath}`));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to copy verifier contract: ${errorMessage}`);
  }
}

export async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== Synchronizing Zero Knowledge Proof in .env file ===\n")
    );

    await copyVerifierContract();

    const proof: ProofData = readProof();

    // Update .env file
    await updateEnvironmentVariables(proof);

    console.log("✅ Successfully synced proof data to .env file.");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      errorMessage
    );
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error: Error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}
