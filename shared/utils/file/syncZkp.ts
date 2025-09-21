import { PATHS_CONFIG } from "@config";
import { ProofData } from "@shared/types/crypto.js";
import { readProof } from "@shared/utils/file/readProof.js";
import { bigintArrayToEnvString } from "@shared/utils/transform/env.js";
import { updateEnvVariable } from "./updateEnvVariable.js";
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
      updates.map(([key, value]) => updateEnvVariable(key, value)),
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    throw new Error(
      `Failed to update environment variables: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function copyVerifierContract(): Promise<void> {
  try {
    console.log(chalk.blue("Copying verifier contract..."));

    const paths = [
      {
        name: "Groth16 verifier",
        source: PATHS_CONFIG.zkp.multiplier2.verifier,
        dest: PATHS_CONFIG.contracts.groth16Verifier,
      },
      // {
      //   name: "UploadCid verifier",
      //   source: PATHS_CONFIG.zkp.uploadCid.verifier,
      //   dest: PATHS_CONFIG.contracts.uploadCidVerifier,
      // },
      {
        name: "CreateWill verifier",
        source: PATHS_CONFIG.zkp.createWill.verifier,
        dest: PATHS_CONFIG.contracts.createWillVerifier,
      }
    ]

    for (const { name, source, dest } of paths) {
      await mkdir(dirname(dest), { recursive: true });

      await copyFile(source, dest);

      console.log(
        chalk.green(
          `✅ ${name} contract copied from ${source} to ${dest}`,
        ),
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to copy verifier contract: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== Synchronizing Zero Knowledge Proof in .env file ===\n"),
    );

    await copyVerifierContract();

    const proof: ProofData = readProof();

    await updateEnvironmentVariables(proof);

    console.log("✅ Successfully synced proof data to .env file.");
  } catch (error) {
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error",
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
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}
