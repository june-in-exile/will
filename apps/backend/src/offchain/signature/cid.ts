import { PATHS_CONFIG, SIGNATURE_CONFIG } from "@shared/config";
import { validateCIDv1, validateEthereumAddress, validatePrivateKey } from "@shared/utils/format"
import { signString, verify } from "@shared/utils/crypto";
import { updateEnvVariable } from "@shared/utils/env";
import { config } from "dotenv";
import assert from "assert";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
  CID: string;
  EXECUTOR_PRIVATE_KEY: string;
  EXECUTOR: string;
}

interface ProcessResult {
  cid: string;
  signature: string;
  executor: string;
  signatureLength: number;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
  const { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR } = process.env;

  if (!CID) {
    throw new Error("Environment variable CID is not set");
  }

  if (!EXECUTOR_PRIVATE_KEY) {
    throw new Error("Environment variable EXECUTOR_PRIVATE_KEY is not set");
  }

  if (!EXECUTOR) {
    throw new Error("Environment variable EXECUTOR is not set");
  }

  if (!validateCIDv1(CID)) {
    throw new Error("Invalid CID v1 format");
  }

  if (!validatePrivateKey(EXECUTOR_PRIVATE_KEY)) {
    throw new Error("Invalid private key format");
  }

  if (!validateEthereumAddress(EXECUTOR)) {
    throw new Error("Invalid executor address");
  }

  return { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR };
}

/**
 * Sign CID with retry mechanism
 */
async function signCidWithRetry(
  cid: string,
  privateKey: string,
  retryCount: number = 0,
): Promise<string> {
  try {
    console.log(chalk.blue("Generating signature for CID..."));
    console.log(chalk.gray("Attempt:"), retryCount + 1);

    const signature = await signString(cid, privateKey);

    if (!signature) {
      throw new Error("Signature generation returned null or undefined");
    }

    if (typeof signature !== "string") {
      throw new Error("Signature must be a string");
    }

    console.log(chalk.green("✅ Signature generated successfully"));
    console.log(
      chalk.gray("Signature:"),
      `${signature.substring(0, 10)}...${signature.substring(signature.length - 8)}`,
    );

    return signature;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red(`❌ Signature generation failed (attempt ${retryCount + 1}):`),
      errorMessage,
    );

    // Retry logic
    if (retryCount < SIGNATURE_CONFIG.maxRetries) {
      console.log(
        chalk.yellow(
          `⚠️ Retrying signature generation (attempt ${retryCount + 2}/${SIGNATURE_CONFIG.maxRetries + 1})...`,
        ),
      );

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, SIGNATURE_CONFIG.retryDelay),
      );

      return signCidWithRetry(cid, privateKey, retryCount + 1);
    }

    throw new Error(
      `Signature generation failed after ${SIGNATURE_CONFIG.maxRetries + 1} attempts: ${errorMessage}`,
    );
  }
}

/**
 * Verify signature with detailed validation
 */
async function verifySignatureWithDetails(
  cid: string,
  signature: string,
  executorAddress: string,
): Promise<boolean> {
  try {
    console.log(chalk.blue("Verifying signature..."));
    console.log(chalk.gray("Message (CID):"), cid);
    console.log(
      chalk.gray("Signature:"),
      `${signature.substring(0, 10)}...${signature.substring(signature.length - 8)}`,
    );
    console.log(chalk.gray("Expected signer:"), executorAddress);

    const isValid = await verify(cid, signature, executorAddress);

    if (!isValid) {
      throw new Error(
        "Signature verification failed - signature does not match the expected signer",
      );
    }

    console.log(chalk.green("✅ Signature verified successfully"));
    console.log(chalk.gray("Verified signer:"), executorAddress);

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Signature verification failed: ${errorMessage}`);
  }
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update environment variable: ${errorMessage}`);
  }
}

/**
 * Process CID signing workflow
 */
async function processCidSigning(): Promise<ProcessResult> {
  try {
    // Validate environment variables
    const { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR } = validateEnvironment();

    console.log(chalk.cyan("\n🔐 Starting CID signing process..."));
    console.log(chalk.gray("CID to sign:"), CID);
    console.log(chalk.gray("Executor address:"), EXECUTOR);

    // Generate signature with retry mechanism
    const cleanPrivateKey = EXECUTOR_PRIVATE_KEY.startsWith("0x")
      ? EXECUTOR_PRIVATE_KEY.slice(2)
      : EXECUTOR_PRIVATE_KEY;
    const signature = await signCidWithRetry(CID, cleanPrivateKey);

    // Verify signature
    await verifySignatureWithDetails(CID, signature, EXECUTOR);

    // Update environment variable
    await updateEnvironmentVariable(signature);

    console.log(
      chalk.green.bold("\n🎉 CID signing process completed successfully!"),
    );

    return {
      cid: CID,
      signature,
      executor: EXECUTOR,
      signatureLength: signature.length,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Error during CID signing process:"), errorMessage);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== CID Signature Generation & Verification ===\n"),
    );

    const result = await processCidSigning();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      cid: result.cid,
      executor: result.executor,
      signatureLength: result.signatureLength,
      success: result.success,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      errorMessage,
    );

    // Use assert for critical validation failures
    if (errorMessage.includes("verification failed")) {
      assert(
        false,
        chalk.red(
          "Critical: Signature verification failed - this indicates a serious security issue",
        ),
      );
    }

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
  main().catch((error: Error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}
