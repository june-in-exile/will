import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { validateFiles } from "@shared/utils/validation/file.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import { JsonRpcProvider } from "ethers";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { createWallet, createContract } from "@shared/utils/blockchain.js";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
import type { ProofData } from "@shared/types/crypto.js";
import { readProof } from "@shared/utils/file/readProof.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { encryptedWillToTypedJsonObject } from "@shared/utils/transform/blockchain.js";
import { printProof } from "@shared/utils/print.js";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { WILL_TYPE } from "@shared/constants/will.js";
import type { EncryptedWill } from "@shared/types/will.js";
import type { UploadCid } from "@shared/types/environment.js";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface UploadCidData {
  proof: ProofData;
  will: JsonCidVerifier.TypedJsonObject;
  cid: string;
}

interface ProcessResult {
  transactionHash: string;
  timestamp: number;
  gasUsed: bigint;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): UploadCid {
  const result = validateEnvironment<UploadCid>(presetValidations.uploadCid());

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Print detailed UploadCIDData information
 */
function printUploadCidData(uploadData: UploadCidData): void {
  console.log(chalk.cyan("\n=== UploadCIDData Details ==="));

  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(uploadData.cid));

  printProof(uploadData.proof);

  console.log(chalk.cyan("\n=== End of UploadCidData Details ===\n"));
}

/**
 * Execute uploadCid transaction
 */
async function executeUploadCid(
  contract: WillFactory,
  uploadData: UploadCidData,
): Promise<ProcessResult> {
  try {
    console.log(chalk.blue("Executing uploadCid transaction..."));

    printUploadCidData(uploadData);

    const tx = await contract.uploadCid(
      uploadData.proof.pA,
      uploadData.proof.pB,
      uploadData.proof.pC,
      uploadData.proof.pubSignals,
      uploadData.will,
      uploadData.cid,
    );

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    if (receipt.status !== 1) {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    console.log(chalk.green("✅ Transaction confirmed:"), receipt.hash);
    console.log(chalk.gray("Block number:"), receipt.blockNumber);
    console.log(chalk.gray("Gas used:"), receipt.gasUsed.toString());

    return {
      transactionHash: receipt.hash,
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    throw new Error(
      `Failed to execute uploadCid: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process CID upload workflow
 */
async function processUploadCid(): Promise<ProcessResult> {
  try {
    validateFiles([
      PATHS_CONFIG.zkp.multiplier2.verifier,
      PATHS_CONFIG.zkp.multiplier2.proof,
      PATHS_CONFIG.zkp.multiplier2.public,
    ]);
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID } =
      validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    const contract = await createContract<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      wallet,
    );

    const proof: ProofData = readProof();
    const willData: EncryptedWill = readWill(WILL_TYPE.ENCRYPTED);
    const will: JsonCidVerifier.TypedJsonObject =
      encryptedWillToTypedJsonObject(willData);

    const result = await executeUploadCid(contract, {
      proof,
      will,
      cid: CID,
    });

    await updateEnvironmentVariables([
      ["UPLOAD_TX_HASH", result.transactionHash],
      ["UPLOAD_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 CID upload process completed successfully!"),
    );

    return result;
  } catch (error) {
    console.error(
      chalk.red("Error during CID upload process:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Upload CID ===\n"));

    const result = await processUploadCid();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      timestamp: `${preview.timestamp(result.timestamp * 1000)}`,
    });
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

export { executeUploadCid, processUploadCid };
