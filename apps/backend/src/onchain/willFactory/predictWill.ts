import type { PredictWill } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG, SALT_CONFIG } from "@config";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import {
  type WillFactory,
  WillFactory__factory,
} from "@shared/types/typechain-types/index.js";
import { Estate, EthereumAddress } from "@shared/types/blockchain.js";
import { WillFileType, FormattedWillData } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { saveAddressedWill } from "@shared/utils/file/saveWill.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { validateEthereumAddress } from "@shared/utils/validation/blockchain.js";
import { createContractInstance } from "@shared/utils/crypto/blockchain.js";
import { JsonRpcProvider } from "ethers";
import crypto from "crypto";
import chalk from "chalk";

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
function validateEnvironmentVariables(): PredictWill {
  const result = validateEnvironment<PredictWill>(
    presetValidations.predictWill(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
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
 * Predict will address
 */
async function predictWillAddress(
  contract: WillFactory,
  testator: EthereumAddress,
  estates: Estate[],
  salt: number,
): Promise<EthereumAddress> {
  try {
    console.log(chalk.blue("Predicting will address..."));
    console.log(chalk.gray("Parameters:"));
    console.log(chalk.gray("- Testator:"), testator);
    console.log(chalk.gray("- Estates count:"), estates.length);
    console.log(chalk.gray("- Salt:"), salt);

    const predictedAddress: EthereumAddress = await contract.predictWill(
      testator,
      estates,
      salt,
    );

    if (!validateEthereumAddress(predictedAddress)) {
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
 * Process will addressing workflow
 */
async function processWillAddressing(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    const { WILL_FACTORY } = validateEnvironmentVariables();

    // Initialize provider and validate connection
    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    // Create contract instance
    const contract = await createContractInstance<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      provider,
    );

    // Read and validate will data
    const willData: FormattedWillData = readWill(WillFileType.FORMATTED);

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
    const updates: Array<[string, string]> = [
      // Will contract info
      ["SALT", salt.toString()],
      ["WILL", predictedAddress],
    ];

    // Add estate-specific variables
    willData.estates.forEach((estate, index) => {
      updates.push(
        [`BENEFICIARY${index}`, estate.beneficiary.toString()],
        [`TOKEN${index}`, estate.token.toString()],
        [`AMOUNT${index}`, estate.amount.toString()],
      );
    });

    await updateEnvironmentVariables(updates);

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
  validateEnvironmentVariables,
  generateSecureSalt,
  predictWillAddress,
  processWillAddressing,
};
