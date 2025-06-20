import { PATHS_CONFIG, NETWORK_CONFIG, SALT_CONFIG } from "@shared/config.js";
import { updateEnvVariable } from "@shared/utils/env/updateEnvVariable.js";
import {
  Estate,
  TestamentFactory,
  TestamentFactory__factory
} from "@shared/types";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { ethers, JsonRpcProvider, Network } from "ethers";
import { config } from "dotenv";
import crypto from "crypto";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
  TESTAMENT_FACTORY_ADDRESS: string;
}

interface TestamentData {
  testator: string;
  estates: Estate[];
}

interface AddressedTestament extends TestamentData {
  testament: string;
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
  const { TESTAMENT_FACTORY_ADDRESS } = process.env;

  if (!TESTAMENT_FACTORY_ADDRESS) {
    throw new Error(
      "Environment variable TESTAMENT_FACTORY_ADDRESS is not set",
    );
  }

  if (!ethers.isAddress(TESTAMENT_FACTORY_ADDRESS)) {
    throw new Error(
      `Invalid testament factory address: ${TESTAMENT_FACTORY_ADDRESS}`,
    );
  }

  return { TESTAMENT_FACTORY_ADDRESS };
}

/**
 * Validate file existence
 */
function validateFiles(): void {
  if (!existsSync(PATHS_CONFIG.testament.formatted)) {
    throw new Error(
      `Formatted testament file does not exist: ${PATHS_CONFIG.testament.formatted}`,
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
 * Read and validate testament data
 */
function readTestamentData(): TestamentData {
  try {
    console.log(chalk.blue("Reading formatted testament data..."));
    const testamentContent = readFileSync(
      PATHS_CONFIG.testament.formatted,
      "utf8",
    );
    const testamentJson: TestamentData = JSON.parse(testamentContent);

    // Validate required fields
    if (!testamentJson.testator) {
      throw new Error("Missing required field: testator");
    }

    if (!testamentJson.estates || !Array.isArray(testamentJson.estates)) {
      throw new Error("Missing or invalid estates array");
    }

    if (testamentJson.estates.length === 0) {
      throw new Error("Estates array cannot be empty");
    }

    // Validate estate structure
    testamentJson.estates.forEach((estate, index) => {
      const requiredFields: (keyof Estate)[] = [
        "beneficiary",
        "token",
        "amount",
      ];
      for (const field of requiredFields) {
        if (!estate[field]) {
          throw new Error(
            `Missing required field '${field}' in estate ${index}`,
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

    console.log(chalk.green("✅ Testament data validated successfully"));
    return testamentJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in testament file: ${error.message}`);
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
): Promise<TestamentFactory> {
  try {
    console.log(chalk.blue("Loading testament factory contract..."));

    const contract = TestamentFactory__factory.connect(
      factoryAddress,
      provider,
    );

    // Validate contract exists at address
    const code = await provider.getCode(factoryAddress);
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
 * Predict testament address
 */
async function predictTestamentAddress(
  contract: TestamentFactory,
  testator: string,
  estates: Estate[],
  salt: number,
): Promise<string> {
  try {
    console.log(chalk.blue("Predicting testament address..."));
    console.log(chalk.gray("Parameters:"));
    console.log(chalk.gray("- Testator:"), testator);
    console.log(chalk.gray("- Estates count:"), estates.length);
    console.log(chalk.gray("- Salt:"), salt);

    const predictedAddress = await contract.predictTestament(
      testator,
      estates,
      salt,
    );

    if (!ethers.isAddress(predictedAddress)) {
      throw new Error(`Invalid predicted address: ${predictedAddress}`);
    }

    console.log(
      chalk.green("✅ Testament address predicted:"),
      chalk.white(predictedAddress),
    );
    return predictedAddress;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to predict testament address: ${errorMessage}`);
  }
}

/**
 * Save addressed testament
 */
function saveAddressedTestament(
  testamentData: TestamentData,
  salt: number,
  predictedAddress: string,
): AddressedTestament {
  try {
    console.log(chalk.blue("Preparing addressed testament..."));

    const addressedTestament: AddressedTestament = {
      ...testamentData,
      salt: salt,
      testament: predictedAddress,
      timestamp: new Date().toISOString(),
      metadata: {
        predictedAt: Date.now(),
        estatesCount: testamentData.estates.length,
      },
    };

    writeFileSync(
      PATHS_CONFIG.testament.addressed,
      JSON.stringify(addressedTestament, null, 4),
    );
    console.log(
      chalk.green("✅ Addressed testament saved to:"),
      PATHS_CONFIG.testament.addressed,
    );

    return addressedTestament;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save addressed testament: ${errorMessage}`);
  }
}

/**
 * Update environment variables with estate and contract data
 */
async function updateEnvironmentVariables(
  estates: Estate[],
  salt: number,
  predictedAddress: string,
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      // Testament contract info
      ["SALT", salt.toString()],
      ["TESTAMENT_ADDRESS", predictedAddress],
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
async function getContractInfo(contract: TestamentFactory): Promise<void> {
  try {
    console.log(chalk.blue("Fetching contract information..."));

    const [executor, testatorVerifier, decryptionVerifier] = await Promise.all([
      contract.executor(),
      contract.testatorVerifier(),
      contract.decryptionVerifier(),
    ]);

    console.log(chalk.gray("Contract addresses:"));
    console.log(chalk.gray("- Executor:"), executor);
    console.log(chalk.gray("- Testator Verifier:"), testatorVerifier);
    console.log(chalk.gray("- Decryption Verifier:"), decryptionVerifier);
  } catch (error) {
    console.warn(chalk.yellow("Warning: Could not fetch contract info"), error);
  }
}

/**
 * Process testament addressing workflow
 */
async function processTestamentAddressing(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { TESTAMENT_FACTORY_ADDRESS } = validateEnvironment();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create contract instance
    const contract = await createContractInstance(
      TESTAMENT_FACTORY_ADDRESS,
      provider,
    );

    // Get contract information
    await getContractInfo(contract);

    // Read and validate testament data
    const testamentData = readTestamentData();

    // Generate salt
    const salt = generateSecureSalt();

    // Predict testament address
    const predictedAddress = await predictTestamentAddress(
      contract,
      testamentData.testator,
      testamentData.estates,
      salt,
    );

    // Save addressed testament
    saveAddressedTestament(testamentData, salt, predictedAddress);

    // Update environment variables
    await updateEnvironmentVariables(
      testamentData.estates,
      salt,
      predictedAddress,
    );

    console.log(
      chalk.green.bold(
        "\n🎉 Testament addressing process completed successfully!",
      ),
    );

    return {
      predictedAddress,
      salt,
      estatesCount: testamentData.estates.length,
      outputPath: PATHS_CONFIG.testament.addressed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during testament addressing process:"),
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
      chalk.cyan(
        "\n=== Testament Address Prediction & Environment Setup ===\n",
      ),
    );

    const result = await processTestamentAddressing();

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
