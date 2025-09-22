import { PATHS_CONFIG } from "@config";
import { ProofData } from "@shared/types/crypto.js";
import { readProof } from "@shared/utils/file/readProof.js";
import { bigintArrayToEnvString } from "@shared/utils/transform/env.js";
import { updateEnvVariable } from "./updateEnvVariable.js";
import { mkdir, copyFile } from "fs/promises";
import path from "path";
import fs from 'fs';
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

function renameVerifier(filePath: string, newContractName: string): void {
  const CONTRACT_NAME = "Groth16Verifier";
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    const updatedContent = fileContent.replace(
      /contract\s+Groth16Verifier/g,
      `contract ${newContractName}`
    );

    if (fileContent === updatedContent) {
      console.warn(chalk.yellow(`Warning: No "${CONTRACT_NAME}" contract found to replace in ${filePath}`));
      return;
    }

    fs.writeFileSync(filePath, updatedContent, 'utf8');

    console.log(chalk.green(`✅ Successfully renamed contract to "${newContractName}" in ${filePath}`));

  } catch (error) {
    throw new Error(
      `Failed to update verifier contract name: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function copyVerifierContract(): Promise<void> {
  try {
    console.log(chalk.blue("Copying verifier contract..."));

    const paths = [
      {
        source: PATHS_CONFIG.zkp.multiplier2.verifier,
        dest: PATHS_CONFIG.contracts.multiplier2Verifier,
      },
      {
        source: PATHS_CONFIG.zkp.cidUpload.verifier,
        dest: PATHS_CONFIG.contracts.cidUploadVerifier,
      },
      {
        source: PATHS_CONFIG.zkp.willCreation.verifier,
        dest: PATHS_CONFIG.contracts.willCreationVerifier,
      }
    ]

    await Promise.all(
      paths.map(async (p) => {
        await mkdir(path.dirname(p.dest), { recursive: true });
        await copyFile(p.source, p.dest);
        const verifierName = path.basename(p.dest, ".sol");
        renameVerifier(p.dest, verifierName);
        console.log(
          chalk.green(
            `✅ Verifier contract copied from ${p.source} to ${p.dest} and rename to ${verifierName}`,
          ),
        );
      })
    )
  } catch (error) {
    throw new Error(
      `Failed to copy verifier contract: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function main(): Promise<void> {
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

export { copyVerifierContract, renameVerifier as updateVerifierName };