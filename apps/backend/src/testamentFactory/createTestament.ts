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
  TESTAMENT_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
  TESTATOR: string;
  SALT: string;
}

interface Estate {
  beneficiary: string;
  token: string;
  amount: bigint;
}

interface EncryptedTestamentData {
  algorithm: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  timestamp: string;
}

interface CreateTestamentData {
  proof: ProofData;
  testament: JSONCIDVerifier.JsonObjectStruct;
  cid: string;
  testator: string;
  estates: Estate[];
  salt: bigint;
}

interface CreateTestamentResult {
  transactionHash: string;
  testamentAddress: string;
  cid: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
  const { TESTAMENT_FACTORY, EXECUTOR_PRIVATE_KEY, CID, TESTATOR, SALT } =
    process.env;

  if (!TESTAMENT_FACTORY) {
    throw new Error("Environment variable TESTAMENT_FACTORY is not set");
  }

  if (!EXECUTOR_PRIVATE_KEY) {
    throw new Error("Environment variable EXECUTOR_PRIVATE_KEY is not set");
  }

  if (!CID) {
    throw new Error("Environment variable CID is not set");
  }

  if (!TESTATOR) {
    throw new Error("Environment variable TESTATOR is not set");
  }

  if (!SALT) {
    throw new Error("Environment variable SALT is not set");
  }

  if (!ethers.isAddress(TESTAMENT_FACTORY)) {
    throw new Error(`Invalid testament factory address: ${TESTAMENT_FACTORY}`);
  }

  if (!validatePrivateKey(EXECUTOR_PRIVATE_KEY)) {
    throw new Error("Invalid private key format");
  }

  if (!validateCIDv1(CID)) {
    throw new Error("Invalid CID v1 format");
  }

  if (!ethers.isAddress(TESTATOR)) {
    throw new Error(`Invalid testator address: ${TESTATOR}`);
  }

  return {
    TESTAMENT_FACTORY,
    EXECUTOR_PRIVATE_KEY,
    CID,
    TESTATOR,
    SALT,
  };
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
        `Invalid beneficiary address at index ${index}: ${beneficiary}`
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
        `Amount must be greater than zero at index ${index}: ${amount}`
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
      "No estates found in environment variables. Please set BENEFICIARY0, TOKEN0, AMOUNT0, etc."
    );
  }

  console.log(
    chalk.green(`✅ Found ${estates.length} estate(s) in environment`)
  );
  return estates;
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
  provider: JsonRpcProvider
): Promise<Network> {
  try {
    console.log(chalk.blue("Validating RPC connection..."));
    const network = await provider.getNetwork();
    console.log(
      chalk.green("✅ Connected to network:"),
      network.name,
      `(Chain ID: ${network.chainId})`
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
  testament: Partial<EncryptedTestamentData>
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
  encryptedTestament: EncryptedTestamentData
): void {
  // Validate encryption algorithm
  if (
    !CRYPTO_CONFIG.supportedAlgorithms.includes(encryptedTestament.algorithm)
  ) {
    throw new Error(
      `Unsupported encryption algorithm: ${encryptedTestament.algorithm}`
    );
  }

  // Validate IV length (AES-GCM typically uses 12 or 16 bytes)
  if (encryptedTestament.iv.length < 12) {
    throw new Error(
      `IV too short: expected at least 12 characters, got ${encryptedTestament.iv.length}`
    );
  }

  // Validate timestamp format
  const timestamp = new Date(encryptedTestament.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error(
      `Invalid timestamp format: ${encryptedTestament.timestamp}`
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
      chalk.yellow("⚠️  Warning: Testament timestamp is older than 1 year")
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
      "utf8"
    );
    const encryptedTestamentJson = JSON.parse(
      testamentContent
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
  encryptedTestamentData: EncryptedTestamentData
): JSONCIDVerifier.JsonObjectStruct {
  try {
    console.log(
      chalk.blue("Converting encrypted testament data to JsonObject format...")
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
      chalk.green("✅ Encrypted testament data converted to JsonObject format")
    );

    return { keys, values };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to convert encrypted testament data: ${errorMessage}`
    );
  }
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(
  factoryAddress: string,
  wallet: Wallet
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
 * Validate CID prerequisites
 */
async function validateCIDPrerequisites(
  contract: TestamentFactory,
  cid: string
): Promise<void> {
  try {
    console.log(chalk.blue("Validating CID prerequisites..."));

    // Check if CID has been validated by testator
    const testatorValidateTime = await contract.testatorValidateTimes(cid);
    if (testatorValidateTime === 0n) {
      throw new Error(
        `CID ${cid} has not been validated by testator. Please run uploadCID first.`
      );
    }

    // Check if CID has been notarized by executor
    const executorValidateTime = await contract.executorValidateTimes(cid);
    if (executorValidateTime <= testatorValidateTime) {
      throw new Error(
        `CID ${cid} has not been notarized by executor or was notarized before testator validation. Please run notarizeCID first.`
      );
    }

    // Check if testament already exists for this CID
    const existingTestament = await contract.testaments(cid);
    if (existingTestament !== ethers.ZeroAddress) {
      throw new Error(
        `Testament already exists for CID ${cid} at address: ${existingTestament}`
      );
    }

    console.log(chalk.green("✅ CID prerequisites validated successfully"));
    console.log(
      chalk.gray("- Testator validated at:"),
      new Date(Number(testatorValidateTime) * 1000).toISOString()
    );
    console.log(
      chalk.gray("- Executor notarized at:"),
      new Date(Number(executorValidateTime) * 1000).toISOString()
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
  testator: string
): void {
  console.log(chalk.blue("Validating estate business rules..."));

  for (let i = 0; i < estates.length; i++) {
    const estate = estates[i];

    // Check beneficiary is not testator
    if (estate.beneficiary.toLowerCase() === testator.toLowerCase()) {
      throw new Error(
        `Estate ${i}: Beneficiary cannot be the same as testator (${estate.beneficiary})`
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
            `⚠️  Warning: Duplicate beneficiary-token pair found at estates ${i} and ${j}: ${estate.beneficiary} - ${estate.token}`
          )
        );
      }
    }
  }

  console.log(chalk.green("✅ Estate business rules validated"));
}

/**
 * Predict testament address
 */
async function predictTestamentAddress(
  contract: TestamentFactory,
  testator: string,
  estates: Estate[],
  salt: bigint
): Promise<string> {
  try {
    console.log(chalk.blue("Predicting testament address..."));

    // Convert estates to the format expected by the contract
    const contractEstates = estates.map((estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    const predictedAddress = await contract.predictTestament(
      testator,
      contractEstates,
      salt
    );

    console.log(
      chalk.green("✅ Testament address predicted:"),
      predictedAddress
    );
    return predictedAddress;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to predict testament address: ${errorMessage}`);
  }
}

/**
 * Print detailed CreateTestamentData information
 */
function printCreateTestamentData(createData: CreateTestamentData): void {
  console.log(chalk.cyan("\n=== CreateTestamentData Details ==="));

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
      chalk.white(estate.beneficiary)
    );
    console.log(chalk.gray("    - Token:"), chalk.white(estate.token));
    console.log(
      chalk.gray("    - Amount:"),
      chalk.white(estate.amount.toString())
    );
  });

  // Print Proof Data
  console.log(chalk.blue("\n🔐 Proof Data:"));
  console.log(
    chalk.gray("- pA[0]:"),
    chalk.white(createData.proof.pA[0].toString())
  );
  console.log(
    chalk.gray("- pA[1]:"),
    chalk.white(createData.proof.pA[1].toString())
  );
  console.log(
    chalk.gray("- pB[0][0]:"),
    chalk.white(createData.proof.pB[0][0].toString())
  );
  console.log(
    chalk.gray("- pB[0][1]:"),
    chalk.white(createData.proof.pB[0][1].toString())
  );
  console.log(
    chalk.gray("- pB[1][0]:"),
    chalk.white(createData.proof.pB[1][0].toString())
  );
  console.log(
    chalk.gray("- pB[1][1]:"),
    chalk.white(createData.proof.pB[1][1].toString())
  );
  console.log(
    chalk.gray("- pC[0]:"),
    chalk.white(createData.proof.pC[0].toString())
  );
  console.log(
    chalk.gray("- pC[1]:"),
    chalk.white(createData.proof.pC[1].toString())
  );
  console.log(
    chalk.gray("- pubSignals[0]:"),
    chalk.white(createData.proof.pubSignals[0].toString())
  );

  // Print Testament Data
  console.log(chalk.blue("\n📝 Encrypted Testament Keys & Values:"));
  createData.testament.keys.forEach((key, index) => {
    const value = createData.testament.values[index];
    console.log(
      chalk.gray(`  [${index}]`),
      chalk.cyan(key),
      chalk.gray("=>"),
      chalk.white(value)
    );
  });

  console.log(chalk.cyan("\n=== End of CreateTestamentData Details ===\n"));
}

/**
 * Execute createTestament transaction
 */
async function executeCreateTestament(
  contract: TestamentFactory,
  createData: CreateTestamentData
): Promise<CreateTestamentResult> {
  try {
    console.log(chalk.blue("Executing createTestament transaction..."));

    // Print detailed create testament data information
    printCreateTestamentData(createData);

    // Validate CID prerequisites
    await validateCIDPrerequisites(contract, createData.cid);

    // Validate estate business rules
    validateEstateBusinessRules(createData.estates, createData.testator);

    // Predict testament address
    const predictedAddress = await predictTestamentAddress(
      contract,
      createData.testator,
      createData.estates,
      createData.salt
    );

    // Convert estates to the format expected by the contract
    const contractEstates = createData.estates.map((estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    // Estimate gas
    const gasEstimate = await contract.createTestament.estimateGas(
      createData.proof.pA,
      createData.proof.pB,
      createData.proof.pC,
      createData.proof.pubSignals,
      createData.testament,
      createData.cid,
      createData.testator,
      contractEstates,
      createData.salt
    );

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.createTestament(
      createData.proof.pA,
      createData.proof.pB,
      createData.proof.pC,
      createData.proof.pubSignals,
      createData.testament,
      createData.cid,
      createData.testator,
      contractEstates,
      createData.salt,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      }
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

    // Find the TestamentCreated event to get the actual testament address
    const testamentCreatedEvent = receipt.logs.find((log) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "TestamentCreated";
      } catch {
        return false;
      }
    });

    let testamentAddress = predictedAddress;
    if (testamentCreatedEvent) {
      const parsed = contract.interface.parseLog(testamentCreatedEvent);
      if (parsed) {
        testamentAddress = parsed.args.testament;
        console.log(chalk.green("✅ Testament created at:"), testamentAddress);

        // Verify the address matches prediction
        if (testamentAddress.toLowerCase() !== predictedAddress.toLowerCase()) {
          console.warn(
            chalk.yellow(
              "⚠️  Warning: Actual testament address differs from prediction"
            )
          );
        }
      }
    }

    return {
      transactionHash: receipt.hash,
      testamentAddress,
      cid: createData.cid,
      timestamp: Date.now(),
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to execute createTestament: ${errorMessage}`);
  }
}

/**
 * Update environment variables with creation data
 */
async function updateEnvironmentVariables(
  result: CreateTestamentResult
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["CREATE_TESTAMENT_TX_HASH", result.transactionHash],
      ["TESTAMENT", result.testamentAddress],
      ["CREATE_TESTAMENT_TIMESTAMP", result.timestamp.toString()],
    ];

    // Execute all updates in parallel
    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value))
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      chalk.yellow("Warning: Failed to update environment variables:"),
      errorMessage
    );
  }
}

/**
 * Get contract information
 */
async function getContractInfo(contract: TestamentFactory): Promise<void> {
  try {
    console.log(chalk.blue("Fetching contract information..."));

    const [
      executor,
      uploadCIDVerifier,
      createTestamentVerifier,
      jsonCidVerifier,
    ] = await Promise.all([
      contract.executor(),
      contract.uploadCIDVerifier(),
      contract.createTestamentVerifier(),
      contract.jsonCidVerifier(),
    ]);

    console.log(chalk.gray("Contract addresses:"));
    console.log(chalk.gray("- Executor:"), executor);
    console.log(chalk.gray("- Testator Verifier:"), uploadCIDVerifier);
    console.log(chalk.gray("- Decryption Verifier:"), createTestamentVerifier);
    console.log(chalk.gray("- JSON CID Verifier:"), jsonCidVerifier);
  } catch (error) {
    console.warn(chalk.yellow("Warning: Could not fetch contract info"), error);
  }
}

/**
 * Process testament creation workflow
 */
async function processCreateTestament(): Promise<CreateTestamentResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { TESTAMENT_FACTORY, EXECUTOR_PRIVATE_KEY, CID, TESTATOR, SALT } =
      validateEnvironment();

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
    const contract = await createContractInstance(TESTAMENT_FACTORY, wallet);

    // Get contract information
    await getContractInfo(contract);

    // Read required data
    const proof: ProofData = readProof();
    const testamentData: EncryptedTestamentData = readTestamentData();
    const testament: JSONCIDVerifier.JsonObjectStruct =
      convertToJsonObject(testamentData);

    // Execute testament creation
    const result = await executeCreateTestament(contract, {
      proof,
      testament,
      cid: CID,
      testator: TESTATOR,
      estates,
      salt: saltBigInt,
    });

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold(
        "\n🎉 Testament creation process completed successfully!"
      )
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during testament creation process:"),
      errorMessage
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const result = await processCreateTestament();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- Testament Address:"), result.testamentAddress);
    console.log(chalk.gray("- CID:"), result.cid);
    console.log(chalk.gray("- Gas Used:"), result.gasUsed.toString());
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      errorMessage
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
