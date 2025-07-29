import type { IPFSDownload } from "@shared/types/environment.js";
import { PATHS_CONFIG } from "@config";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import type { SupportedAlgorithm } from "@shared/types/crypto.js";
import type { Base64String } from "@shared/types/base64String.js";
import { createHelia, Helia } from "helia";
import { json, JSON as HeliaJSON } from "@helia/json";
import { CID } from "multiformats/cid";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import chalk from "chalk";

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, "../.env") });

interface DownloadedWill {
  algorithm: SupportedAlgorithm;
  ciphertext: Base64String;
  iv: Base64String;
  authTag: Base64String;
  timestamp: string;
}

interface DownloadResult {
  downloaded: DownloadedWill;
  success: boolean;
  error?: string;
  stage?: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): IPFSDownload {
  const result = validateEnvironment<IPFSDownload>(presetValidations.ipfsDownload());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
}

/**
 * Save downloaded will to file
 */
function saveDownloadedWill(downloadedWill: DownloadedWill): void {
  try {
    writeFileSync(
      PATHS_CONFIG.will.downloaded,
      JSON.stringify(downloadedWill, null, 4),
    );
    console.log(
      chalk.green("✅ Downloaded will saved to:"),
      PATHS_CONFIG.will.downloaded,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save downloaded will: ${errorMessage}`);
  }
}

/**
 * Download encrypted will from IPFS and save to local file
 */
async function processIPFSDownload(): Promise<DownloadResult> {
  let helia: Helia | undefined;

  try {
    const { CID: cidString } = validateEnvironmentVariables();

    // Create Helia instance
    helia = await createHelia();
    const j: HeliaJSON = json(helia);

    const cid = CID.parse(cidString);
    console.log(chalk.blue("CID:"), cid.toString());
    console.log(chalk.blue("Downloading will from IPFS..."));

    const downloadedWill: DownloadedWill = await j.get(cid);

    // Save downloaded will
    saveDownloadedWill(downloadedWill);

    console.log(
      chalk.green.bold("\n🎉 IPFS download process completed successfully!"),
    );

    return {
      downloaded: downloadedWill,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Failed to download from IPFS:"), errorMessage);
    throw error;
  } finally {
    // Clean up Helia instance
    if (helia) {
      try {
        console.log(chalk.blue("Cleaning up Helia instance..."));
        await helia.stop();
        console.log(chalk.gray("✅ Helia instance stopped successfully"));
      } catch (stopError) {
        const stopErrorMessage =
          stopError instanceof Error ? stopError.message : "Unknown stop error";
        console.warn(
          chalk.yellow("⚠️ Warning while stopping Helia:"),
          stopErrorMessage,
        );
      }
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Download from IPFS ===\n"));

    const result = await processIPFSDownload();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      errorMessage,
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
  main().catch((error: Error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}

export {
  validateEnvironmentVariables,
  saveDownloadedWill,
  processIPFSDownload
}
