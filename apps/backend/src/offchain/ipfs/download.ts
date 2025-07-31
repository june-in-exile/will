import type { IpfsDownload } from "@shared/types/environment.js";
import { PATHS_CONFIG } from "@config";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import { WillFileType, type DownloadedWill } from "@shared/types/will.js";
import { createHeliaInstance } from "@shared/utils/ipfs.js";
import { saveWill } from "@shared/utils/file/saveWill.js";
import { Helia } from "helia";
import { JSON } from "@helia/json";
import { CID } from "multiformats/cid";
import chalk from "chalk";

interface ProcessResult {
  downloaded: DownloadedWill;
  downloadedWillPath: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): IpfsDownload {
  const result = validateEnvironment<IpfsDownload>(
    presetValidations.ipfsDownload(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Download data from IPFS
 */
async function downloadFromIpfs(
  jsonHandler: JSON,
  cid: string
): Promise<DownloadedWill> {
  console.log(chalk.blue("CID:"), cid.toString());
  console.log(chalk.blue("Downloading will from IPFS..."));

  const downloadedWill: DownloadedWill = await jsonHandler.get(CID.parse(cid));
  return downloadedWill;
}

/**
 * Download encrypted will from IPFS and save to local file
 */
async function processIPFSDownload(): Promise<ProcessResult> {
  let helia: Helia | undefined;

  try {
    const { CID } = validateEnvironmentVariables();

    const { helia: heliaInstance, jsonHandler } = await createHeliaInstance();
    helia = heliaInstance;

    const downloadedWill = await downloadFromIpfs(jsonHandler, CID);

    // Save downloaded will
    saveWill(WillFileType.DOWNLOADED, downloadedWill);

    console.log(
      chalk.green.bold("\n🎉 IPFS download process completed successfully!"),
    );

    return {
      downloaded: downloadedWill,
      downloadedWillPath: PATHS_CONFIG.will.downloaded,
    };
  } catch (error) {
    console.error(chalk.red("Failed to download from IPFS:"), error instanceof Error ? error.message : "Unknown error");
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
    console.log(chalk.bgCyan("\n=== IPFS Will Download ===\n"));

    const result = await processIPFSDownload();

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

export { validateEnvironmentVariables, processIPFSDownload };
