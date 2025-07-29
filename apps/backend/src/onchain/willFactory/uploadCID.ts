import type { UploadCid } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import type { SupportedAlgorithm, ProofData } from "@shared/types/crypto.js";
import { WillFileType } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import { readProof } from "@shared/utils/file/readProof.js";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
import { existsSync } from "fs";
import { ethers, JsonRpcProvider, Network, Wallet } from "ethers";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

interface EncryptedWillData {
  algorithm: SupportedAlgorithm;
  iv: string;
  authTag: string;
  ciphertext: string;
  timestamp: string;
}

interface UploadCidData {
  proof: ProofData;
  will: JsonCidVerifier.TypedJsonObject;
  cid: string;
}

interface UploadResult {
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
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
}

/**
 * Validate required files
 */
function validateZkpFiles(): void {
  const requiredFiles = [
    PATHS_CONFIG.zkp.multiplier2.verifier,
    PATHS_CONFIG.zkp.multiplier2.proof,
    PATHS_CONFIG.zkp.multiplier2.public,
  ];

  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      throw new Error(`Required file does not exist: ${filePath}`);
    }
  }
}

/**
 * Validate RPC connection
 */
async function validateRpcConnection(
  provider: JsonRpcProvider,
): Promise<Network> {
  try {
    console.log(chalk.blue("Validating RPC connection..."));
    const network = await provider.getNetwork();
    console.log(
      chalk.green("✅ Connected to network:"),
      network.name,
      `(Chain ID: ${network.chainId})`,
    );
    return network;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to connect to RPC endpoint: ${errorMessage}`);
  }
}

/**
 * Create wallet instance
 */
function createWallet(privateKey: string, provider: JsonRpcProvider): Wallet {
  try {
    console.log(chalk.blue("Creating wallet instance..."));
    const wallet = new Wallet(privateKey, provider);
    console.log(chalk.green("✅ Wallet created:"), wallet.address);
    return wallet;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create wallet: ${errorMessage}`);
  }
}

/**
 * Convert will data to JsonObject format
 */
function convertToJsonObject(
  encryptedWillData: EncryptedWillData,
): JsonCidVerifier.JsonObjectStruct {
  try {
    console.log(
      chalk.blue("Converting encrypted will data to JsonObject format..."),
    );

    const keys: string[] = [];
    const values: string[] = [];

    // Add encryption metadata
    keys.push("algorithm");
    values.push(encryptedWillData.algorithm);

    keys.push("iv");
    values.push(encryptedWillData.iv);

    keys.push("authTag");
    values.push(encryptedWillData.authTag);

    keys.push("ciphertext");
    values.push(encryptedWillData.ciphertext);

    keys.push("timestamp");
    values.push(encryptedWillData.timestamp);

    console.log(
      chalk.green("✅ Encrypted will data converted to JsonObject format"),
    );

    return { keys, values };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to convert encrypted will data: ${errorMessage}`);
  }
}

/**
 * Convert will data to TypedJsonObject format
 */
function convertToTypedJsonObject(
  encryptedWillData: EncryptedWillData,
): JsonCidVerifier.TypedJsonObjectStruct {
  try {
    console.log(
      chalk.blue("Converting encrypted will data to TypedJsonObject format..."),
    );

    const keys: string[] = [];
    const values: JsonCidVerifier.JsonValueStruct[] = [];

    keys.push("algorithm");
    values.push({
      value: encryptedWillData.algorithm,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("iv");
    values.push({
      value: encryptedWillData.iv,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("authTag");
    values.push({
      value: encryptedWillData.authTag,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("ciphertext");
    values.push({
      value: encryptedWillData.ciphertext,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("timestamp");
    values.push({
      value: encryptedWillData.timestamp,
      valueType: 1, // JsonValueType.NUMBER
    });

    console.log(
      chalk.green("✅ Encrypted will data converted to TypedJsonObject format"),
    );

    return { keys, values };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to convert encrypted will data: ${errorMessage}`);
  }
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(
  factoryAddress: string,
  wallet: Wallet,
): Promise<WillFactory> {
  try {
    console.log(chalk.blue("Loading will factory contract..."));

    const contract = WillFactory__factory.connect(factoryAddress, wallet);

    if (!wallet.provider) {
      throw new Error("Wallet provider is null");
    }
    const code = await wallet.provider.getCode(factoryAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${factoryAddress}`);
    }

    console.log(chalk.green("✅ Will factory contract loaded"));
    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create contract instance: ${errorMessage}`);
  }
}

/**
 * Print detailed UploadCIDData information
 */
function printUploadCidData(uploadData: UploadCidData): void {
  console.log(chalk.cyan("\n=== UploadCIDData Details ==="));

  // Print CID
  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(uploadData.cid));

  // Print Proof Data
  console.log(chalk.blue("\n🔐 Proof Data:"));
  console.log(
    chalk.gray("- pA[0]:"),
    chalk.white(uploadData.proof.pA[0].toString()),
  );
  console.log(
    chalk.gray("- pA[1]:"),
    chalk.white(uploadData.proof.pA[1].toString()),
  );
  console.log(
    chalk.gray("- pB[0][0]:"),
    chalk.white(uploadData.proof.pB[0][0].toString()),
  );
  console.log(
    chalk.gray("- pB[0][1]:"),
    chalk.white(uploadData.proof.pB[0][1].toString()),
  );
  console.log(
    chalk.gray("- pB[1][0]:"),
    chalk.white(uploadData.proof.pB[1][0].toString()),
  );
  console.log(
    chalk.gray("- pB[1][1]:"),
    chalk.white(uploadData.proof.pB[1][1].toString()),
  );
  console.log(
    chalk.gray("- pC[0]:"),
    chalk.white(uploadData.proof.pC[0].toString()),
  );
  console.log(
    chalk.gray("- pC[1]:"),
    chalk.white(uploadData.proof.pC[1].toString()),
  );
  console.log(
    chalk.gray("- pubSignals[0]:"),
    chalk.white(uploadData.proof.pubSignals[0].toString()),
  );

  // Print Will Data
  console.log(chalk.blue("\n📝 Excrypted Will Keys & Values:"));
  uploadData.will.keys.forEach((key: string, index: string) => {
    const jsonValue: JsonCidVerifier.JsonValue = uploadData.will.values[index];
    let valueType: string;
    switch (jsonValue.valueType) {
      case 0:
        valueType = "STRING";
        break;
      case 1:
        valueType = "NUMBER";
        break;
      case 2:
        valueType = "BOOLEAN";
        break;
      case 3:
        valueType = "NULL";
        break;
      default:
        throw new Error("Invalid JsonValueType");
    }
    console.log(
      chalk.gray(`  [${index}]`),
      chalk.cyan(key),
      chalk.gray("=>"),
      chalk.white(`{value: ${jsonValue.value}, valueType: ${valueType}}`),
    );
  });

  console.log(chalk.cyan("\n=== End of UploadCidData Details ===\n"));
}

/**
 * Execute uploadCid transaction
 */
async function executeUploadCid(
  contract: WillFactory,
  uploadData: UploadCidData,
): Promise<UploadResult> {
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
      timestamp: Date.now(),
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to execute uploadCid: ${errorMessage}`);
  }
}

/**
 * Update environment variables with upload data
 */
async function updateEnvironmentVariables(result: UploadResult): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["UPLOAD_TX_HASH", result.transactionHash],
      ["UPLOAD_TIMESTAMP", result.timestamp.toString()],
    ];

    // Execute all updates in parallel
    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value)),
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      chalk.yellow("Warning: Failed to update environment variables:"),
      errorMessage,
    );
  }
}

/**
 * Process CID upload workflow
 */
async function processUploadCid(): Promise<UploadResult> {
  try {
    // Validate prerequisites
    validateZkpFiles();
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID } = validateEnvironmentVariables();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance(WILL_FACTORY, wallet);

    // Read required data
    const proof: ProofData = readProof();
    const willData: EncryptedWillData = readWill(WillFileType.ENCRYPTED);
    const will: JsonCidVerifier.TypedJsonObject =
      convertToTypedJsonObject(willData);

    // Execute upload
    const result = await executeUploadCid(contract, {
      proof,
      will,
      cid: CID,
    });

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold("\n🎉 CID upload process completed successfully!"),
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Error during CID upload process:"), errorMessage);
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
  validateZkpFiles,
  validateEnvironmentVariables,
  validateRpcConnection,
  createWallet,
  convertToJsonObject,
  convertToTypedJsonObject,
  createContractInstance,
  printUploadCidData,
  executeUploadCid,
  updateEnvironmentVariables,
  processUploadCid
}
