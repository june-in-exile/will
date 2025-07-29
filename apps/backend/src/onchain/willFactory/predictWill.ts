import { PATHS_CONFIG, NETWORK_CONFIG, SALT_CONFIG } from "@config";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import {
  type Will,
  type WillFactory,
  WillFactory__factory,
} from "@shared/types/typechain-types/index.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { ethers, JsonRpcProvider, Network } from "ethers";
import { config } from "dotenv";
import crypto from "crypto";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
  WILL_FACTORY: string;
}

interface WillData {
  testator: string;
  estates: Will.EstateStruct[];
}

interface AddressedWill extends WillData {
  will: string;
  salt: number;
  timestamp: string;
  metadata: {
    predictedAt: number;
    estatesCount: number;
  };
}

interface ProcessResult {
  predictedAddress: string;
  salt: number;
  estatesCount: number;
  outputPath: string;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
  const { WILL_FACTORY } = process.env;

  if (!WILL_FACTORY) {
    throw new Error("Environment variable WILL_FACTORY is not set");
  }

  if (!ethers.isAddress(WILL_FACTORY)) {
    throw new Error(`Invalid will factory address: ${WILL_FACTORY}`);
  }

  return { WILL_FACTORY };
}

/**
 * Validate file existence
 */
function validateFiles(): void {
  if (!existsSync(PATHS_CONFIG.will.formatted)) {
    throw new Error(
      `Formatted will file does not exist: ${PATHS_CONFIG.will.formatted}`,
    );
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
 * Generate cryptographically secure salt
 */
function generateSecureSalt(timestamp: number = Date.now()): number {
  try {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);

    const randomPart = randomArray[0] % SALT_CONFIG.timestampMultiplier;
    const salt =
      (timestamp * SALT_CONFIG.timestampMultiplier + randomPart) %
      SALT_CONFIG.maxSafeInteger;

    console.log(chalk.gray("Generated salt:"), salt);
    return salt;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate salt: ${errorMessage}`);
  }
}

/**
 * Read and validate will data
 */
function readWillData(): WillData {
  try {
    console.log(chalk.blue("Reading formatted will data..."));
    const willContent = readFileSync(PATHS_CONFIG.will.formatted, "utf8");
    const willJson: WillData = JSON.parse(willContent);

    // Validate required fields
    if (!willJson.testator) {
      throw new Error("Missing required field: testator");
    }

    if (!willJson.estates || !Array.isArray(willJson.estates)) {
      throw new Error("Missing or invalid estates array");
    }

    if (willJson.estates.length === 0) {
      throw new Error("Estates array cannot be empty");
    }

    // Validate estate structure
    willJson.estates.forEach((estate, index) => {
      const requiredFields: (keyof Will.EstateStruct)[] = [
        "beneficiary",
        "token",
        "amount",
      ];
      for (const field of requiredFields) {
        if (!estate[field]) {
          throw new Error(
            `Missing required field '${String(field)}' in estate ${index}`,
          );
        }
      }

      // Validate addresses
      if (!ethers.isAddress(estate.beneficiary)) {
        throw new Error(
          `Invalid beneficiary address in estate ${index}: ${estate.beneficiary}`,
        );
      }

      if (!ethers.isAddress(estate.token)) {
        throw new Error(
          `Invalid token address in estate ${index}: ${estate.token}`,
        );
      }
    });

    console.log(chalk.green("✅ Will data validated successfully"));
    return willJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in will file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(
  factoryAddress: string,
  provider: JsonRpcProvider,
): Promise<WillFactory> {
  try {
    console.log(chalk.blue("Loading will factory contract..."));

    const contract = WillFactory__factory.connect(factoryAddress, provider);

    // Validate contract exists at address
    const code = await provider.getCode(factoryAddress);
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
 * Predict will address
 */
async function predictWillAddress(
  contract: WillFactory,
  testator: string,
  estates: Will.EstateStruct[],
  salt: number,
): Promise<string> {
  try {
    console.log(chalk.blue("Predicting will address..."));
    console.log(chalk.gray("Parameters:"));
    console.log(chalk.gray("- Testator:"), testator);
    console.log(chalk.gray("- Estates count:"), estates.length);
    console.log(chalk.gray("- Salt:"), salt);

    const predictedAddress = await contract.predictWill(
      testator,
      estates,
      salt,
    );

    if (!ethers.isAddress(predictedAddress)) {
      throw new Error(`Invalid predicted address: ${predictedAddress}`);
    }

    console.log(
      chalk.green("✅ Will address predicted:"),
      chalk.white(predictedAddress),
    );
    return predictedAddress;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to predict will address: ${errorMessage}`);
  }
}

/**
 * Save addressed will
 */
function saveAddressedWill(
  willData: WillData,
  salt: number,
  predictedAddress: string,
): AddressedWill {
  try {
    console.log(chalk.blue("Preparing addressed will..."));

    const addressedWill: AddressedWill = {
      ...willData,
      salt: salt,
      will: predictedAddress,
      timestamp: new Date().toISOString(),
      metadata: {
        predictedAt: Date.now(),
        estatesCount: willData.estates.length,
      },
    };

    writeFileSync(
      PATHS_CONFIG.will.addressed,
      JSON.stringify(addressedWill, null, 4),
    );
    console.log(
      chalk.green("✅ Addressed will saved to:"),
      PATHS_CONFIG.will.addressed,
    );

    return addressedWill;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save addressed will: ${errorMessage}`);
  }
}

/**
 * Update environment variables with estate and contract data
 */
async function updateEnvironmentVariables(
  estates: Will.EstateStruct[],
  salt: number,
  predictedAddress: string,
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      // Will contract info
      ["SALT", salt.toString()],
      ["WILL", predictedAddress],
    ];

    // Add estate-specific variables
    estates.forEach((estate, index) => {
      updates.push(
        [`BENEFICIARY${index}`, estate.beneficiary.toString()],
        [`TOKEN${index}`, estate.token.toString()],
        [`AMOUNT${index}`, estate.amount.toString()],
      );
    });

    // Execute all updates in parallel
    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value)),
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update environment variables: ${errorMessage}`);
  }
}

/**
 * List the contract's information
 */
async function getContractInfo(contract: WillFactory): Promise<void> {
  try {
    console.log(chalk.blue("Fetching contract information..."));

    const [executor, uploadCidVerifier, createWillVerifier] = await Promise.all(
      [
        contract.executor(),
        contract.uploadCidVerifier(),
        contract.createWillVerifier(),
      ],
    );

    console.log(chalk.gray("Contract addresses:"));
    console.log(chalk.gray("- Executor:"), executor);
    console.log(chalk.gray("- Testator Verifier:"), uploadCidVerifier);
    console.log(chalk.gray("- Decryption Verifier:"), createWillVerifier);
  } catch (error) {
    console.warn(chalk.yellow("Warning: Could not fetch contract info"), error);
  }
}

/**
 * Process will addressing workflow
 */
async function processWillAddressing(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { WILL_FACTORY } = validateEnvironment();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create contract instance
    const contract = await createContractInstance(WILL_FACTORY, provider);

    // Get contract information
    await getContractInfo(contract);

    // Read and validate will data
    const willData = readWillData();

    // Generate salt
    const salt = generateSecureSalt();

    // Predict will address
    const predictedAddress = await predictWillAddress(
      contract,
      willData.testator,
      willData.estates,
      salt,
    );

    // Save addressed will
    saveAddressedWill(willData, salt, predictedAddress);

    // Update environment variables
    await updateEnvironmentVariables(willData.estates, salt, predictedAddress);

    console.log(
      chalk.green.bold("\n🎉 Will addressing process completed successfully!"),
    );

    return {
      predictedAddress,
      salt,
      estatesCount: willData.estates.length,
      outputPath: PATHS_CONFIG.will.addressed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will addressing process:"),
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
    console.log(
      chalk.cyan("\n=== Will Address Prediction & Environment Setup ===\n"),
    );

    const result = await processWillAddressing();

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
  validateEnvironment,
  validateFiles,
  validateRpcConnection,
  generateSecureSalt,
  readWillData,
  createContractInstance,
  predictWillAddress,
  saveAddressedWill,
  updateEnvironmentVariables,
  getContractInfo,
  processWillAddressing
}
