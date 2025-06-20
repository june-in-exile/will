import { PATHS_CONFIG, NETWORK_CONFIG, CRYPTO_CONFIG } from "@shared/config.js";
import { updateEnvVariable } from "@shared/utils/env";
import { readProof } from "@shared/utils/read";
import {
  validateBase64,
  validatePrivateKey,
  validateCIDv1,
} from "@shared/utils/format";
import { readFileSync, existsSync } from "fs";
import { ethers, JsonRpcProvider, Network, Wallet } from "ethers";
import {
  TestamentFactory,
  TestamentFactory__factory,
  JSONCIDVerifier,
  ProofData,
} from "@shared/types";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
  TESTAMENT_FACTORY_ADDRESS: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
}

interface EncryptedTestamentData {
  algorithm: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  timestamp: string;
}

interface UploadCIDData {
  proof: ProofData;
  testament: JSONCIDVerifier.JsonObjectStruct;
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
function validateEnvironment(): EnvironmentVariables {
  const { TESTAMENT_FACTORY_ADDRESS, EXECUTOR_PRIVATE_KEY, CID } = process.env;

  if (!TESTAMENT_FACTORY_ADDRESS) {
    throw new Error(
      "Environment variable TESTAMENT_FACTORY_ADDRESS is not set",
    );
  }

  if (!EXECUTOR_PRIVATE_KEY) {
    throw new Error("Environment variable TESTATOR_PRIVATE_KEY is not set");
  }

  if (!CID) {
    throw new Error("Environment variable CID is not set");
  }

  if (!ethers.isAddress(TESTAMENT_FACTORY_ADDRESS)) {
    throw new Error(
      `Invalid testament factory address: ${TESTAMENT_FACTORY_ADDRESS}`,
    );
  }

  if (!validatePrivateKey(EXECUTOR_PRIVATE_KEY)) {
    throw new Error("Invalid private key format");
  }

  if (!validateCIDv1(CID)) {
    throw new Error("Invalid CID v1 format");
  }

  return { TESTAMENT_FACTORY_ADDRESS, EXECUTOR_PRIVATE_KEY, CID };
}

/**
 * Validate required files
 */
function validateFiles(): void {
  const requiredFiles = [
    PATHS_CONFIG.circuits.proof,
    PATHS_CONFIG.circuits.public,
    PATHS_CONFIG.testament.encrypted,
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
 * Validate required fields
 */
function validateRequiredFields(
  testament: Partial<EncryptedTestamentData>,
): asserts testament is EncryptedTestamentData {
  const REQUIRED_FIELDS: (keyof EncryptedTestamentData)[] = [
    "algorithm",
    "iv",
    "authTag",
    "ciphertext",
    "timestamp",
  ] as const;

  for (const field of REQUIRED_FIELDS) {
    if (!testament[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Validate business rules
 */
function validateTestamentBusinessRules(
  encryptedTestament: EncryptedTestamentData,
): void {
  // Validate encryption algorithm
  if (
    !CRYPTO_CONFIG.supportedAlgorithms.includes(encryptedTestament.algorithm)
  ) {
    throw new Error(
      `Unsupported encryption algorithm: ${encryptedTestament.algorithm}`,
    );
  }

  // Validate IV length (AES-GCM typically uses 12 or 16 bytes)
  if (encryptedTestament.iv.length < 12) {
    throw new Error(
      `IV too short: expected at least 12 characters, got ${encryptedTestament.iv.length}`,
    );
  }

  // Validate timestamp format
  const timestamp = new Date(encryptedTestament.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error(
      `Invalid timestamp format: ${encryptedTestament.timestamp}`,
    );
  }

  // Validate authTag is Base64
  if (!validateBase64(encryptedTestament.authTag)) {
    throw new Error("AuthTag must be valid Base64");
  }

  // Validate ciphertext is not empty
  if (
    !encryptedTestament.ciphertext ||
    encryptedTestament.ciphertext.length === 0
  ) {
    throw new Error("Ciphertext cannot be empty");
  }

  // Warn if timestamp is too old
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (timestamp < oneYearAgo) {
    console.warn(
      chalk.yellow("⚠️  Warning: Testament timestamp is older than 1 year"),
    );
  }
}

/**
 * Read testament JSON data
 */
function readTestamentData(): EncryptedTestamentData {
  try {
    console.log(chalk.blue("Reading encrypted testament JSON data..."));
    const testamentContent = readFileSync(
      PATHS_CONFIG.testament.encrypted,
      "utf8",
    );
    const encryptedTestamentJson = JSON.parse(
      testamentContent,
    ) as EncryptedTestamentData;

    validateRequiredFields(encryptedTestamentJson);

    validateTestamentBusinessRules(encryptedTestamentJson);

    console.log(chalk.green("✅ Testament JSON data validated successfully"));
    return encryptedTestamentJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in testament file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Convert testament data to JsonObject format
 */
function convertToJsonObject(
  encryptedTestamentData: EncryptedTestamentData,
): JSONCIDVerifier.JsonObjectStruct {
  try {
    console.log(
      chalk.blue("Converting encrypted testament data to JsonObject format..."),
    );

    const keys: string[] = [];
    const values: string[] = [];

    // Add encryption metadata
    keys.push("algorithm");
    values.push(encryptedTestamentData.algorithm);

    keys.push("iv");
    values.push(encryptedTestamentData.iv);

    keys.push("authTag");
    values.push(encryptedTestamentData.authTag);

    keys.push("ciphertext");
    values.push(encryptedTestamentData.ciphertext);

    keys.push("timestamp");
    values.push(encryptedTestamentData.timestamp);

    console.log(
      chalk.green("✅ Encrypted testament data converted to JsonObject format"),
    );

    return { keys, values };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to convert encrypted testament data: ${errorMessage}`,
    );
  }
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(
  factoryAddress: string,
  wallet: Wallet,
): Promise<TestamentFactory> {
  try {
    console.log(chalk.blue("Loading testament factory contract..."));

    const contract = TestamentFactory__factory.connect(factoryAddress, wallet);

    if (!wallet.provider) {
      throw new Error("Wallet provider is null");
    }
    const code = await wallet.provider.getCode(factoryAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${factoryAddress}`);
    }

    console.log(chalk.green("✅ Testament factory contract loaded"));
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
function printUploadCIDData(uploadData: UploadCIDData): void {
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

  // Print Testament Data
  console.log(chalk.blue("\n📝 Excrypted Testament Keys & Values:"));
  uploadData.testament.keys.forEach((key, index) => {
    const value = uploadData.testament.values[index];
    console.log(
      chalk.gray(`  [${index}]`),
      chalk.cyan(key),
      chalk.gray("=>"),
      chalk.white(value),
    );
  });

  console.log(chalk.cyan("\n=== End of UploadCIDData Details ===\n"));
}

/**
 * Execute uploadCID transaction
 */
async function executeUploadCID(
  contract: TestamentFactory,
  uploadData: UploadCIDData,
): Promise<UploadResult> {
  try {
    console.log(chalk.blue("Executing uploadCID transaction..."));

    // Print detailed upload data information
    printUploadCIDData(uploadData);

    // Estimate gas
    const gasEstimate = await contract.uploadCID.estimateGas(
      uploadData.proof.pA,
      uploadData.proof.pB,
      uploadData.proof.pC,
      uploadData.proof.pubSignals,
      uploadData.testament,
      uploadData.cid,
    );

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.uploadCID(
      uploadData.proof.pA,
      uploadData.proof.pB,
      uploadData.proof.pC,
      uploadData.proof.pubSignals,
      uploadData.testament,
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
    throw new Error(`Failed to execute uploadCID: ${errorMessage}`);
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
 * List the contract's information
 */
async function getContractInfo(contract: TestamentFactory): Promise<void> {
  try {
    console.log(chalk.blue("Fetching contract information..."));

    const [executor, testatorVerifier, decryptionVerifier, jsonCidVerifier] =
      await Promise.all([
        contract.executor(),
        contract.testatorVerifier(),
        contract.decryptionVerifier(),
        contract.jsonCidVerifier(),
      ]);

    console.log(chalk.gray("Contract addresses:"));
    console.log(chalk.gray("- Executor:"), executor);
    console.log(chalk.gray("- Testator Verifier:"), testatorVerifier);
    console.log(chalk.gray("- Decryption Verifier:"), decryptionVerifier);
    console.log(chalk.gray("- JSON CID Verifier:"), jsonCidVerifier);
  } catch (error) {
    console.warn(chalk.yellow("Warning: Could not fetch contract info"), error);
  }
}

/**
 * Process CID upload workflow
 */
async function processUploadCID(): Promise<UploadResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { TESTAMENT_FACTORY_ADDRESS, EXECUTOR_PRIVATE_KEY, CID } =
      validateEnvironment();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance(
      TESTAMENT_FACTORY_ADDRESS,
      wallet,
    );

    // Get contract information
    await getContractInfo(contract);

    // Read required data
    const proof: ProofData = readProof();
    const testamentData: EncryptedTestamentData = readTestamentData();
    const testament: JSONCIDVerifier.JsonObjectStruct = convertToJsonObject(testamentData);

    // Execute upload
    const result = await executeUploadCID(contract, {
      proof,
      testament,
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
    const result = await processUploadCID();

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
