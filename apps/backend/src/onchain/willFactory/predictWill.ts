import type { PredictWill } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
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
import { WillFileType, FormattedWillData, AddressedWillData } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { saveWill } from "@shared/utils/file/saveWill.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { validateEthereumAddress } from "@shared/utils/validation/blockchain.js";
import { createContractInstance } from "@shared/utils/crypto/blockchain.js";
import { generateSalt } from "@shared/utils/crypto/salt.js";
import { printEstates } from "@shared/utils/crypto/printData.js"
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface predictWillData {
  testator: EthereumAddress,
  estates: Estate[],
  salt: number,
}

interface ProcessResult {
  predictedAddress: string;
  salt: number;
  outputPath: string;
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
 * Print detailed PredictWillData information
 */
function printPredictWillData(predictData: predictWillData): void {
  console.log(chalk.cyan("\n=== predictWillData Details ==="));

  console.log(chalk.blue("\nParameters:"));
  console.log(chalk.gray("- Testator:"), predictData.testator);
  console.log(chalk.gray("- Salt:"), predictData.salt);
  printEstates(predictData.estates);

  console.log(chalk.cyan("\n=== End of predictWillData Details ===\n"));
}

/**
 * Predict will address
 */
async function executePredictWill(
  contract: WillFactory,
  predictData: predictWillData,
): Promise<EthereumAddress> {
  try {
    console.log(chalk.blue("Executing predictWill transaction..."));

    printPredictWillData(predictData);

    const predictedAddress: EthereumAddress = await contract.predictWill(
      predictData.testator,
      predictData.estates,
      predictData.salt,
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
    throw new Error(`Failed to predict will address: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    const salt = generateSalt();

    // Predict will address
    const predictedAddress = await executePredictWill(contract, {
      testator: willData.testator,
      estates: willData.estates,
      salt,
    });

    const addressedWillData: AddressedWillData = {
      ...willData,
      salt,
      will: predictedAddress,
    }

    // Save addressed will
    saveWill(WillFileType.ADDRESSED, addressedWillData)

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
      outputPath: PATHS_CONFIG.will.addressed,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will addressing process:"),
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
    console.log(
      chalk.cyan("\n=== Will Address Prediction & Environment Setup ===\n"),
    );

    const result = await processWillAddressing();

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
    console.error(chalk.red.bold("Uncaught error:"), error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  });
}

export {
  validateEnvironmentVariables,
  executePredictWill,
  processWillAddressing,
};
