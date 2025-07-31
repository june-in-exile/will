import { PATHS_CONFIG, IPFS_CONFIG } from "@config";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { WillFileType, type EncryptedWillData } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { createHelia, Helia } from "helia";
import { json, JSON as HeliaJSON } from "@helia/json";
import { CID } from "multiformats/cid";
import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";

const execPromise = promisify(exec);

interface HeliaInstance {
  helia: Helia;
  jsonHandler: HeliaJSON;
}

interface ProcessResult {
  cid?: string;
  success: boolean;
  uploadPath?: string;
  pinnedInHelia?: boolean;
  pinnedLocally?: boolean;
  error?: string;
  stage?: string;
}

/**
 * Create and configure Helia instance
 */
async function createHeliaInstance(): Promise<HeliaInstance> {
  try {
    console.log(chalk.blue("Initializing Helia IPFS node..."));
    const helia = await createHelia();
    const jsonHandler = json(helia);

    console.log(chalk.green("✅ Helia instance created successfully"));
    return { helia, jsonHandler };
  } catch (error) {
    throw new Error(`Failed to create Helia instance: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Upload data to IPFS
 */
async function uploadToIPFS(
  jsonHandler: HeliaJSON,
  willData: EncryptedWillData,
): Promise<CID> {
  try {
    console.log(chalk.blue("Uploading encrypted will to IPFS..."));
    const cid = await jsonHandler.add(willData);

    console.log(chalk.green("✅ Data uploaded successfully"));
    console.log(chalk.gray("CID:"), chalk.white(cid.toString()));

    return cid;
  } catch (error) {
    throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Pin content in local IPFS daemon with retry mechanism
 * Now throws error on failure instead of returning false
 */
async function pinInLocalDaemon(
  cid: CID,
  retryAttempts: number = IPFS_CONFIG.pinning.retryAttempts,
): Promise<boolean> {
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      console.log(
        chalk.blue(
          `Attempting to pin in local IPFS daemon (attempt ${attempt}/${retryAttempts})...`,
        ),
      );

      const { stdout, stderr } = await execPromise(
        `ipfs pin add ${cid.toString()}`,
        { timeout: IPFS_CONFIG.pinning.timeout },
      );

      if (stderr && stderr.trim()) {
        console.warn(chalk.yellow("IPFS daemon warning:"), stderr.trim());
      }

      console.log(
        chalk.green("✅ Content pinned in local IPFS daemon:"),
        stdout.trim(),
      );
      return true;
    } catch (error: unknown) {
      const isLastAttempt = attempt === retryAttempts;

      // Type-safe error handling
      if (error && typeof error === "object" && "code" in error) {
        const execError = error as { code: string; message?: string };

        if (execError.code === "TIMEOUT") {
          console.warn(
            chalk.yellow(
              `⚠️ Timeout on attempt ${attempt}: IPFS daemon pinning timed out`,
            ),
          );
        } else if (execError.code === "ENOENT") {
          console.error(
            chalk.red(
              "❌ IPFS CLI not found - please ensure IPFS is installed and in PATH",
            ),
          );
          throw new Error("IPFS CLI not available - pinning failed");
        } else {
          const errorMessage = execError.message || "Unknown exec error";
          console.warn(
            chalk.yellow(`⚠️ Attempt ${attempt} failed:`),
            errorMessage,
          );
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.warn(
          chalk.yellow(`⚠️ Attempt ${attempt} failed:`),
          errorMessage,
        );
      }

      if (isLastAttempt) {
        console.error(
          chalk.red("❌ Could not pin in local IPFS daemon after all attempts"),
        );
        console.error(chalk.gray("This might be because:"));
        console.error(chalk.gray("- The daemon is not running"));
        console.error(chalk.gray("- The CID format is incompatible"));
        console.error(chalk.gray("- Network connectivity issues"));

        // Throw error on final failure
        throw new Error(
          `Failed to pin content in local IPFS daemon after ${retryAttempts} attempts`,
        );
      }
    }
  }

  return false;
}

/**
 * Display access information
 */
function displayAccessInfo(cid: CID): void {
  console.log(chalk.cyan("\n📍 Access Information:"));
  console.log(chalk.gray("CID:"), chalk.white(cid.toString()));

  console.log(chalk.cyan("\n🌐 IPFS Gateways:"));
  IPFS_CONFIG.gateways.forEach((gateway, index) => {
    const url = `${gateway}${cid}`;
    console.log(chalk.gray(`${index + 1}.`), chalk.blue(url));
  });
}

/**
 * Process IPFS upload workflow with strict pinning requirement
 */
async function processIPFSUpload(): Promise<ProcessResult> {
  let helia: Helia | undefined;

  try {
    // Read and validate will data
    const willData: EncryptedWillData = readWill(WillFileType.ENCRYPTED);

    // Create Helia instance
    const { helia: heliaInstance, jsonHandler } = await createHeliaInstance();
    helia = heliaInstance;

    // Upload to IPFS
    const cid = await uploadToIPFS(jsonHandler, willData);

    // Pin in local daemon
    try {
      await pinInLocalDaemon(cid);
      console.log(
        chalk.green("✅ Local daemon pinning completed successfully"),
      );
    } catch (daemonError) {
      console.error(
        chalk.red("❌ Local daemon pinning failed - aborting process"),
      );
      const errorMessage =
        daemonError instanceof Error
          ? daemonError.message
          : "Unknown daemon error";
      throw new Error(`Critical daemon pinning failure: ${errorMessage}`);
    }

    // Only proceed if both pinning operations succeeded
    console.log(chalk.cyan("\n📋 Finalizing Process..."));
    console.log(chalk.green("All pinning operations completed successfully"));

    // Display access information
    displayAccessInfo(cid);

    // Update environment variables
    await updateEnvironmentVariables([["CID", cid.toString()]]);

    console.log(
      chalk.green.bold("\n🎉 IPFS upload process completed successfully!"),
    );

    return {
      cid: cid.toString(),
      success: true,
      uploadPath: PATHS_CONFIG.will.encrypted,
      pinnedInHelia: true,
      pinnedLocally: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Error during IPFS upload process:"), errorMessage);

    // Determine failure type for better error reporting
    if (
      errorMessage.includes("pinning failure") ||
      errorMessage.includes("pin content") ||
      errorMessage.includes("Helia pinning")
    ) {
      console.error(
        chalk.red.bold("❌ Process failed due to pinning requirements not met"),
      );

      // Determine which pinning failed
      let failedStage = "pinning";
      if (errorMessage.includes("Helia")) {
        failedStage = "helia_pinning";
      } else if (errorMessage.includes("daemon")) {
        failedStage = "daemon_pinning";
      }

      return {
        success: false,
        error: errorMessage,
        stage: failedStage,
        uploadPath: PATHS_CONFIG.will.encrypted,
      };
    }

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
    console.log(chalk.cyan("\n=== IPFS Will Upload & Pinning ===\n"));

    const result = await processIPFSUpload();

    if (result.success) {
      console.log(chalk.green.bold("\n✅ Process completed successfully!"));
      console.log(chalk.gray("Results:"), {
        cid: result.cid,
        pinnedInHelia: result.pinnedInHelia,
        pinnedLocally: result.pinnedLocally,
        success: result.success,
      });
    } else {
      console.log(chalk.red.bold("\n❌ Process failed!"));
      console.log(chalk.gray("Error details:"), {
        stage: result.stage,
        error: result.error,
        success: result.success,
      });

      // Provide specific guidance based on failure type
      if (result.stage === "helia_pinning") {
        console.log(chalk.yellow("\n💡 Troubleshooting Helia pinning:"));
        console.log(chalk.gray("- Check Helia node configuration"));
        console.log(chalk.gray("- Verify network connectivity"));
        console.log(chalk.gray("- Check available storage space"));
      } else if (result.stage === "daemon_pinning") {
        console.log(chalk.yellow("\n💡 Troubleshooting local daemon pinning:"));
        console.log(chalk.gray("- Ensure IPFS daemon is running"));
        console.log(chalk.gray("- Check IPFS CLI installation"));
        console.log(chalk.gray("- Verify daemon API accessibility"));
      }

      process.exit(1);
    }
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
  createHeliaInstance,
  uploadToIPFS,
  pinInLocalDaemon,
  displayAccessInfo,
  processIPFSUpload,
};
