import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
import { WillFileType, type EncryptedWillData } from "@shared/types/will.js";
import type { ProofData } from "@shared/types/crypto.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import { encryptedWillToTypedJsonObject } from "@shared/utils/transform/blockchain.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { readProof } from "@shared/utils/file/readProof.js";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import type { UploadCid } from "@shared/types/environment.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import {
  createWallet,
  createContractInstance,
} from "@shared/utils/crypto/blockchain.js";
import { printProofData, printEncryptedWillData } from "@shared/utils/crypto/printData.js";
import { JsonRpcProvider } from "ethers";
import { validateFiles } from "@shared/utils/validation/file.js";
import chalk from "chalk";

interface UploadCidData {
  proof: ProofData;
  will: JsonCidVerifier.TypedJsonObject;
  cid: string;
}

interface ProcessResult {
  transactionHash: string;
  cid: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
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

  printProofData(uploadData.proof);
  printEncryptedWillData(uploadData.will);

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

    // Print detailed upload data information
    printUploadCidData(uploadData);

    // Estimate gas
    const gasEstimate = await contract.uploadCid.estimateGas(
      uploadData.proof.pA,
      uploadData.proof.pB,
      uploadData.proof.pC,
      uploadData.proof.pubSignals,
      uploadData.will,
      uploadData.cid,
    );

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.uploadCid(
      uploadData.proof.pA,
      uploadData.proof.pB,
      uploadData.proof.pC,
      uploadData.proof.pubSignals,
      uploadData.will,
      uploadData.cid,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      },
    );

    console.log(chalk.yellow("Transaction sent:"), tx.hash);
    console.log(chalk.blue("Waiting for confirmation..."));

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
      cid: uploadData.cid,
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    throw new Error(`Failed to execute uploadCid: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Process CID upload workflow
 */
async function processUploadCid(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    validateFiles([
      PATHS_CONFIG.zkp.multiplier2.verifier,
      PATHS_CONFIG.zkp.multiplier2.proof,
      PATHS_CONFIG.zkp.multiplier2.public,
    ]);
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID } =
      validateEnvironmentVariables();

    // Initialize provider and validate connection
    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      wallet,
    );

    // Read required data
    const proof: ProofData = readProof();
    const willData: EncryptedWillData = readWill(WillFileType.ENCRYPTED);
    const will: JsonCidVerifier.TypedJsonObject =
      encryptedWillToTypedJsonObject(willData);

    // Execute upload
    const result = await executeUploadCid(contract, {
      proof,
      will,
      cid: CID,
    });

    // Update environment
    await updateEnvironmentVariables([
      ["UPLOAD_TX_HASH", result.transactionHash],
      ["UPLOAD_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 CID upload process completed successfully!"),
    );

    return result;
  } catch (error) {
    console.error(chalk.red("Error during CID upload process:"), error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const result = await processUploadCid();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- CID:"), result.cid);
    console.log(chalk.gray("- Gas Used:"), result.gasUsed.toString());
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

export { validateEnvironmentVariables, executeUploadCid, processUploadCid };
