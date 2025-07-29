import { PATHS_CONFIG, NETWORK_CONFIG, CRYPTO_CONFIG } from "@config";
import { readProof } from "@shared/utils/file/readProof.js";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import type { CreateWill } from "@shared/types/environment.js";
import type { Estate } from "@shared/types/blockchain.js";
import { type SupportedAlgorithm } from "@shared/types/crypto.js";
import { Base64String } from "@shared/types/base64String.js";
import { readFileSync, existsSync } from "fs";
import { ethers, JsonRpcProvider, Network, Wallet } from "ethers";
import { ProofData } from "@shared/types/crypto.js";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
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

interface CreateWillData {
  proof: ProofData;
  will: JsonCidVerifier.JsonObjectStruct;
  cid: string;
  testator: string;
  estates: Estate[];
  salt: bigint;
}

interface CreateWillResult {
  transactionHash: string;
  willAddress: string;
  cid: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): CreateWill {
  const result = validateEnvironment<CreateWill>(presetValidations.createWill());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
}

/**
 * Parse estates from environment variables
 */
function parseEstatesFromEnvironment(): Estate[] {
  const estates: Estate[] = [];
  let index = 0;

  while (true) {
    const beneficiary = process.env[`BENEFICIARY${index}`];
    const token = process.env[`TOKEN${index}`];
    const amount = process.env[`AMOUNT${index}`];

    if (!beneficiary || !token || !amount) {
      break;
    }

    // Validate addresses
    if (!ethers.isAddress(beneficiary)) {
      throw new Error(
        `Invalid beneficiary address at index ${index}: ${beneficiary}`,
      );
    }

    if (!ethers.isAddress(token)) {
      throw new Error(`Invalid token address at index ${index}: ${token}`);
    }

    // Validate amount
    let parsedAmount: bigint;
    try {
      parsedAmount = BigInt(amount);
    } catch {
      throw new Error(`Invalid amount at index ${index}: ${amount}`);
    }

    if (parsedAmount <= 0n) {
      throw new Error(
        `Amount must be greater than zero at index ${index}: ${amount}`,
      );
    }

    estates.push({
      beneficiary,
      token,
      amount: parsedAmount,
    });

    index++;
  }

  if (estates.length === 0) {
    throw new Error(
      "No estates found in environment variables. Please set BENEFICIARY0, TOKEN0, AMOUNT0, etc.",
    );
  }

  console.log(
    chalk.green(`✅ Found ${estates.length} estate(s) in environment`),
  );
  return estates;
}

/**
 * Validate required files
 */
function validateFiles(): void {
  const requiredFiles = [
    PATHS_CONFIG.zkp.multiplier2.proof,
    PATHS_CONFIG.zkp.multiplier2.public,
    PATHS_CONFIG.will.encrypted,
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
  will: Partial<EncryptedWillData>,
): asserts will is EncryptedWillData {
  const REQUIRED_FIELDS: (keyof EncryptedWillData)[] = [
    "algorithm",
    "iv",
    "authTag",
    "ciphertext",
    "timestamp",
  ] as const;

  for (const field of REQUIRED_FIELDS) {
    if (!will[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Validate business rules
 */
function validateWillBusinessRules(encryptedWill: EncryptedWillData): void {
  // Validate encryption algorithm
  if (!CRYPTO_CONFIG.supportedAlgorithms.includes(encryptedWill.algorithm)) {
    throw new Error(
      `Unsupported encryption algorithm: ${encryptedWill.algorithm}`,
    );
  }

  // Validate IV length (AES-GCM typically uses 12 or 16 bytes)
  if (encryptedWill.iv.length < 12) {
    throw new Error(
      `IV too short: expected at least 12 characters, got ${encryptedWill.iv.length}`,
    );
  }

  // Validate timestamp format
  const timestamp = new Date(encryptedWill.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error(`Invalid timestamp format: ${encryptedWill.timestamp}`);
  }

  // Validate authTag is Base64
  if (!Base64String.isValid(encryptedWill.authTag)) {
    throw new Error("AuthTag must be valid Base64");
  }

  // Validate ciphertext is not empty
  if (!encryptedWill.ciphertext || encryptedWill.ciphertext.length === 0) {
    throw new Error("Ciphertext cannot be empty");
  }

  // Warn if timestamp is too old
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (timestamp < oneYearAgo) {
    console.warn(
      chalk.yellow("⚠️  Warning: Will timestamp is older than 1 year"),
    );
  }
}

/**
 * Read will JSON data
 */
function readWillData(): EncryptedWillData {
  try {
    console.log(chalk.blue("Reading encrypted will JSON data..."));
    const willContent = readFileSync(PATHS_CONFIG.will.encrypted, "utf8");
    const encryptedWillJson = JSON.parse(willContent) as EncryptedWillData;

    validateRequiredFields(encryptedWillJson);

    validateWillBusinessRules(encryptedWillJson);

    console.log(chalk.green("✅ Will JSON data validated successfully"));
    return encryptedWillJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in will file: ${error.message}`);
    }
    throw error;
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
 * Validate CID prerequisites
 */
async function validateCidPrerequisites(
  contract: WillFactory,
  cid: string,
): Promise<void> {
  try {
    console.log(chalk.blue("Validating CID prerequisites..."));

    // Check if CID has been validated by testator
    const testatorValidateTime = await contract.testatorValidateTimes(cid);
    if (testatorValidateTime === 0n) {
      throw new Error(
        `CID ${cid} has not been validated by testator. Please run uploadCid first.`,
      );
    }

    // Check if CID has been notarized by executor
    const executorValidateTime = await contract.executorValidateTimes(cid);
    if (executorValidateTime <= testatorValidateTime) {
      throw new Error(
        `CID ${cid} has not been notarized by executor or was notarized before testator validation. Please run notarizeCid first.`,
      );
    }

    // Check if will already exists for this CID
    const existingWill = await contract.wills(cid);
    if (existingWill !== ethers.ZeroAddress) {
      throw new Error(
        `Will already exists for CID ${cid} at address: ${existingWill}`,
      );
    }

    console.log(chalk.green("✅ CID prerequisites validated successfully"));
    console.log(
      chalk.gray("- Testator validated at:"),
      new Date(Number(testatorValidateTime) * 1000).toISOString(),
    );
    console.log(
      chalk.gray("- Executor notarized at:"),
      new Date(Number(executorValidateTime) * 1000).toISOString(),
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to validate CID prerequisites: ${errorMessage}`);
  }
}

/**
 * Validate estate business rules
 */
function validateEstateBusinessRules(
  estates: Estate[],
  testator: string,
): void {
  console.log(chalk.blue("Validating estate business rules..."));

  for (let i = 0; i < estates.length; i++) {
    const estate = estates[i];

    // Check beneficiary is not testator
    if (estate.beneficiary.toLowerCase() === testator.toLowerCase()) {
      throw new Error(
        `Estate ${i}: Beneficiary cannot be the same as testator (${estate.beneficiary})`,
      );
    }

    // Check for duplicate beneficiary-token pairs
    for (let j = i + 1; j < estates.length; j++) {
      const otherEstate = estates[j];
      if (
        estate.beneficiary.toLowerCase() ===
        otherEstate.beneficiary.toLowerCase() &&
        estate.token.toLowerCase() === otherEstate.token.toLowerCase()
      ) {
        console.warn(
          chalk.yellow(
            `⚠️  Warning: Duplicate beneficiary-token pair found at estates ${i} and ${j}: ${estate.beneficiary} - ${estate.token}`,
          ),
        );
      }
    }
  }

  console.log(chalk.green("✅ Estate business rules validated"));
}

/**
 * Predict will address
 */
async function predictWillAddress(
  contract: WillFactory,
  testator: string,
  estates: Estate[],
  salt: bigint,
): Promise<string> {
  try {
    console.log(chalk.blue("Predicting will address..."));

    // Convert estates to the format expected by the contract
    const contractEstates = estates.map((estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    const predictedAddress = await contract.predictWill(
      testator,
      contractEstates,
      salt,
    );

    console.log(chalk.green("✅ Will address predicted:"), predictedAddress);
    return predictedAddress;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to predict will address: ${errorMessage}`);
  }
}

/**
 * Print detailed CreateWillData information
 */
function printCreateWillData(createData: CreateWillData): void {
  console.log(chalk.cyan("\n=== CreateWillData Details ==="));

  // Print CID
  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(createData.cid));

  // Print Testator
  console.log(chalk.blue("\n👤 Testator Information:"));
  console.log(chalk.gray("- Testator:"), chalk.white(createData.testator));

  // Print Salt
  console.log(chalk.blue("\n🧂 Salt Information:"));
  console.log(chalk.gray("- Salt:"), chalk.white(createData.salt.toString()));

  // Print Estates
  console.log(chalk.blue("\n🏛️  Estate Information:"));
  createData.estates.forEach((estate, index) => {
    console.log(chalk.gray(`  Estate ${index}:`));
    console.log(
      chalk.gray("    - Beneficiary:"),
      chalk.white(estate.beneficiary),
    );
    console.log(chalk.gray("    - Token:"), chalk.white(estate.token));
    console.log(
      chalk.gray("    - Amount:"),
      chalk.white(estate.amount.toString()),
    );
  });

  // Print Proof Data
  console.log(chalk.blue("\n🔐 Proof Data:"));
  console.log(
    chalk.gray("- pA[0]:"),
    chalk.white(createData.proof.pA[0].toString()),
  );
  console.log(
    chalk.gray("- pA[1]:"),
    chalk.white(createData.proof.pA[1].toString()),
  );
  console.log(
    chalk.gray("- pB[0][0]:"),
    chalk.white(createData.proof.pB[0][0].toString()),
  );
  console.log(
    chalk.gray("- pB[0][1]:"),
    chalk.white(createData.proof.pB[0][1].toString()),
  );
  console.log(
    chalk.gray("- pB[1][0]:"),
    chalk.white(createData.proof.pB[1][0].toString()),
  );
  console.log(
    chalk.gray("- pB[1][1]:"),
    chalk.white(createData.proof.pB[1][1].toString()),
  );
  console.log(
    chalk.gray("- pC[0]:"),
    chalk.white(createData.proof.pC[0].toString()),
  );
  console.log(
    chalk.gray("- pC[1]:"),
    chalk.white(createData.proof.pC[1].toString()),
  );
  console.log(
    chalk.gray("- pubSignals[0]:"),
    chalk.white(createData.proof.pubSignals[0].toString()),
  );

  // Print Will Data
  console.log(chalk.blue("\n📝 Encrypted Will Keys & Values:"));
  createData.will.keys.forEach((key: string, index: string) => {
    const value = createData.will.values[index];
    console.log(
      chalk.gray(`  [${index}]`),
      chalk.cyan(key),
      chalk.gray("=>"),
      chalk.white(value),
    );
  });

  console.log(chalk.cyan("\n=== End of CreateWillData Details ===\n"));
}

/**
 * Execute createWill transaction
 */
async function executeCreateWill(
  contract: WillFactory,
  createData: CreateWillData,
): Promise<CreateWillResult> {
  try {
    console.log(chalk.blue("Executing createWill transaction..."));

    // Print detailed create will data information
    printCreateWillData(createData);

    // Validate CID prerequisites
    await validateCidPrerequisites(contract, createData.cid);

    // Validate estate business rules
    validateEstateBusinessRules(createData.estates, createData.testator);

    // Predict will address
    const predictedAddress = await predictWillAddress(
      contract,
      createData.testator,
      createData.estates,
      createData.salt,
    );

    // Convert estates to the format expected by the contract
    const contractEstates = createData.estates.map((estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    // Estimate gas
    const gasEstimate = await contract.createWill.estimateGas(
      createData.proof.pA,
      createData.proof.pB,
      createData.proof.pC,
      createData.proof.pubSignals,
      createData.will,
      createData.cid,
      createData.testator,
      contractEstates,
      createData.salt,
    );

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.createWill(
      createData.proof.pA,
      createData.proof.pB,
      createData.proof.pC,
      createData.proof.pubSignals,
      createData.will,
      createData.cid,
      createData.testator,
      contractEstates,
      createData.salt,
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

    // Find the WillCreated event to get the actual will address
    const willCreatedEvent = receipt.logs.find((log: string) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "WillCreated";
      } catch {
        return false;
      }
    });

    let willAddress = predictedAddress;
    if (willCreatedEvent) {
      const parsed = contract.interface.parseLog(willCreatedEvent);
      if (parsed) {
        willAddress = parsed.args.will;
        console.log(chalk.green("✅ Will created at:"), willAddress);

        // Verify the address matches prediction
        if (willAddress.toLowerCase() !== predictedAddress.toLowerCase()) {
          console.warn(
            chalk.yellow(
              "⚠️  Warning: Actual will address differs from prediction",
            ),
          );
        }
      }
    }

    return {
      transactionHash: receipt.hash,
      willAddress,
      cid: createData.cid,
      timestamp: Date.now(),
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to execute createWill: ${errorMessage}`);
  }
}

/**
 * Update environment variables with creation data
 */
async function updateEnvironmentVariables(
  result: CreateWillResult,
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["CREATE_WILL_TX_HASH", result.transactionHash],
      ["WILL", result.willAddress],
      ["CREATE_WILL_TIMESTAMP", result.timestamp.toString()],
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
 * Get contract information
 */
async function getContractInfo(contract: WillFactory): Promise<void> {
  try {
    console.log(chalk.blue("Fetching contract information..."));

    const [executor, uploadCidVerifier, createWillVerifier, jsonCidVerifier] =
      await Promise.all([
        contract.executor(),
        contract.uploadCidVerifier(),
        contract.createWillVerifier(),
        contract.jsonCidVerifier(),
      ]);

    console.log(chalk.gray("Contract addresses:"));
    console.log(chalk.gray("- Executor:"), executor);
    console.log(chalk.gray("- Testator Verifier:"), uploadCidVerifier);
    console.log(chalk.gray("- Decryption Verifier:"), createWillVerifier);
    console.log(chalk.gray("- JSON CID Verifier:"), jsonCidVerifier);
  } catch (error) {
    console.warn(chalk.yellow("Warning: Could not fetch contract info"), error);
  }
}

/**
 * Process will creation workflow
 */
async function processCreateWill(): Promise<CreateWillResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID, TESTATOR, SALT } =
      validateEnvironmentVariables();

    // Parse estates from environment
    const estates = parseEstatesFromEnvironment();

    // Parse salt
    let saltBigInt: bigint;
    try {
      saltBigInt = BigInt(SALT);
    } catch {
      throw new Error(`Invalid salt format: ${SALT}`);
    }

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance(WILL_FACTORY, wallet);

    // Get contract information
    await getContractInfo(contract);

    // Read required data
    const proof: ProofData = readProof();
    const willData: EncryptedWillData = readWillData();
    const will: JsonCidVerifier.JsonObjectStruct =
      convertToJsonObject(willData);

    // Execute will creation
    const result = await executeCreateWill(contract, {
      proof,
      will,
      cid: CID,
      testator: TESTATOR,
      estates,
      salt: saltBigInt,
    });

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold("\n🎉 Will creation process completed successfully!"),
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will creation process:"),
      errorMessage,
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const result = await processCreateWill();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- Will Address:"), result.willAddress);
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
  validateEnvironmentVariables,
  parseEstatesFromEnvironment,
  validateFiles,
  validateRpcConnection,
  createWallet,
  validateRequiredFields,
  validateWillBusinessRules,
  readWillData,
  convertToJsonObject,
  createContractInstance,
  validateCidPrerequisites,
  validateEstateBusinessRules,
  predictWillAddress,
  printCreateWillData,
  executeCreateWill,
  updateEnvironmentVariables,
  getContractInfo,
  processCreateWill
}
