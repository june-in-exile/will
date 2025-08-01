import type { PredictWill } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import {
  WillFactory,
  WillFactory__factory,
} from "@shared/types/typechain-types/index.js";
import { Estate, EthereumAddress } from "@shared/types/blockchain.js";
import { WILL_TYPE } from "@shared/constants/will.js";
import type { FormattedWill, AddressedWill } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { saveWill } from "@shared/utils/file/saveWill.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { validateEthereumAddress } from "@shared/utils/validation/blockchain.js";
import { createContract } from "@shared/utils/blockchain.js";
import { generateSalt } from "@shared/utils/cryptography/salt.js";
import { printEstates } from "@shared/utils/print.js";
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface predictWillData {
  testator: EthereumAddress;
  estates: Estate[];
  salt: number;
}

interface ProcessResult {
  predictedAddress: string;
  salt: number;
  addressedWillPath: string;
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

  console.log(chalk.blue("\n👤 Testator Information:"));
  console.log(chalk.gray("- Testator:"), chalk.white(predictData.testator));

  console.log(chalk.blue("\n🧂 Salt Information:"));
  console.log(chalk.gray("- Salt:"), chalk.white(predictData.salt));

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
    throw new Error(
      `Failed to predict will address: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process will addressing workflow
 */
async function processPredictWill(): Promise<ProcessResult> {
  try {
    const { WILL_FACTORY } = validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const contract = await createContract<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      provider,
    );

    const willData: FormattedWill = readWill(WILL_TYPE.FORMATTED);

    const salt = generateSalt();

    const predictedAddress = await executePredictWill(contract, {
      testator: willData.testator,
      estates: willData.estates,
      salt,
    });

    const addressedWillData: AddressedWill = {
      ...willData,
      salt,
      will: predictedAddress,
    };

    saveWill(WILL_TYPE.ADDRESSED, addressedWillData);

    const updates: Array<[string, string]> = [
      ["SALT", salt.toString()],
      ["WILL", predictedAddress],
    ];

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
      addressedWillPath: PATHS_CONFIG.will.addressed,
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
    console.log(chalk.bgCyan("\n=== Will Address Prediction ===\n"));

    const result = await processPredictWill();

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
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { executePredictWill, processPredictWill };
