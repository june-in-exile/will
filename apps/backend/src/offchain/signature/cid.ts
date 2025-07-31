import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import type { CidSigning } from "@shared/types/environment.js";
import { EthereumAddress } from "@shared/types/blockchain.js";
import { validateCidv1 } from "@shared/utils/validation/cid.js";
import { validateEthereumAddress, validatePrivateKey } from "@shared/utils/validation/blockchain.js";
import { signString, verify } from "@shared/utils/cryptography/signature.js";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import chalk from "chalk";

interface CidSigningData {
  cid: string;
  signer: EthereumAddress;
  privateKey: string;
}

interface ProcessResult {
  cid: string;
  signer: string;
  signature: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): CidSigning {
  const result = validateEnvironment<CidSigning>(
    presetValidations.cidSigning(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Update environment variable with signature
 */
async function updateEnvironmentVariable(signature: string): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    updateEnvVariable("EXECUTOR_SIGNATURE", signature);

    console.log(chalk.green("✅ Environment variable updated successfully"));
  } catch (error) {
    throw new Error(`Failed to update environment variable: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Print detailed CidSigningData information
 */
function printCidSigningData(CidSigningData: CidSigningData): void {
  console.log(chalk.cyan("\n=== CidSigningData Details ===\n"));

  console.log(chalk.gray("CID to sign:"), CidSigningData.cid);
  console.log(chalk.gray("Signer address:"), CidSigningData.signer);

  console.log(chalk.cyan("\n=== End of CidSigningData Details ===\n"));
}

/**
 * Execute CID signing with verification
 */
async function executeCidSigning(cidSigningData: CidSigningData): Promise<string> {
  try {
    console.log(chalk.blue("\nStarting CID signing process..."));
    
    printCidSigningData(cidSigningData);
    
    const signature = await signString(cidSigningData.cid, cidSigningData.privateKey);
    
    const isValid = await verify(cidSigningData.cid, signature, cidSigningData.signer);
    if (!isValid) {
      throw new Error(`Signature verification failed.`);
    }
    
    console.log(chalk.green("✅ CID signed!"));
    return signature;
  } catch (error) { 
    throw new Error(`Failed to sign CID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Process CID signing workflow
 */
async function processCidSigning(): Promise<ProcessResult> {
  try {
    const { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR } =
      validateEnvironmentVariables();

    if (!validateCidv1(CID)) {
      throw new Error(`Invalid cid v1: ${CID}`);
    }

    if (!validateEthereumAddress(EXECUTOR)) {
      throw new Error(`Invalid executor address: ${EXECUTOR}`);
    }

    if (!validatePrivateKey(EXECUTOR_PRIVATE_KEY)) {
      throw new Error(`Invalid private key.`);
    }

    const signature = await executeCidSigning({
      cid: CID,
      signer: EXECUTOR as EthereumAddress,
      privateKey: EXECUTOR_PRIVATE_KEY,
    })

    await updateEnvironmentVariable(signature);

    console.log(
      chalk.green.bold("\n🎉 CID signing process completed successfully!"),
    );

    return {
      cid: CID,
      signer: EXECUTOR,
      signature,
    };
  } catch (error) {
    console.error(chalk.red("Error during CID signing process:"), error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(
      chalk.bgCyan("\n=== CID Signature Generation ===\n"),
    );

    const result = await processCidSigning();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), result);
  } catch (error) {
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error",
    );

    // Log stack trace in development mode
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error) => {
    console.error(chalk.red.bold("Uncaught error:"), error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  });
}

export {
  validateEnvironmentVariables,
  updateEnvironmentVariable,
  processCidSigning,
};
