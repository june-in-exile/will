import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { WILL_TYPE } from "@shared/constants/willType.js";
import type { EncryptedWill } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import {
  createHeliaInstance,
  uploadToIpfs,
  pinInLocalDaemon,
  stopHelia,
  displayAccessInfo,
} from "@shared/utils/ipfs.js";
import { Helia } from "helia";
import chalk from "chalk";

interface ProcessResult {
  cid: string;
}

/**
 * Process IPFS upload workflow with strict pinning requirement
 */
async function processIPFSUpload(): Promise<ProcessResult> {
  let helia: Helia | undefined;

  try {
    const willData: EncryptedWill = readWill(WILL_TYPE.ENCRYPTED);

    const { helia: heliaInstance, jsonHandler } = await createHeliaInstance();
    helia = heliaInstance;

    const cid = await uploadToIpfs(jsonHandler, willData);

    await pinInLocalDaemon(cid);

    displayAccessInfo(cid);

    await updateEnvironmentVariables([["CID", cid.toString()]]);

    console.log(
      chalk.green.bold("\n🎉 IPFS upload process completed successfully!"),
    );

    return {
      cid: cid.toString(),
    };
  } catch (error) {
    throw new Error(
      `Failed to upload will to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    if (helia) {
      stopHelia(helia);
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== IPFS Will Upload & Pinning ===\n"));

    const result = await processIPFSUpload();

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
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { processIPFSUpload };
