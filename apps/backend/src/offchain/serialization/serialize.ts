import { PATHS_CONFIG } from "@config";
import type { SignedWill, SerializedWill } from "@shared/types/index.js";
import { WILL_TYPE, FIELD_HEX_LENGTH } from "@shared/constants/index.js";
import { readWill, saveWill } from "@shared/utils/file/index.js";
import chalk from "chalk";

interface ProcessResult extends SerializedWill {
  serializedWillPath: string;
}

/**
 * Serializes will data into a hex string format
 * @param signedWill - The will data object
 * @returns Concatenated hex string
 */
function serializeWill(signedWill: SignedWill): SerializedWill {
  let hex = "";

  // Add testator address (remove 0x prefix)
  hex += signedWill.testator.slice(2);

  // Add executor address (remove 0x prefix)
  hex += signedWill.executor.slice(2);

  // Add each estate
  for (let i = 0; i < signedWill.estates.length; i++) {
    const estate = signedWill.estates[i];

    // Add beneficiary address (remove 0x prefix)
    hex += estate.beneficiary.slice(2);
    // Add token address (remove 0x prefix)
    hex += estate.token.slice(2);
    // Add amount as hex string
    hex += estate.amount.toString(16).padStart(FIELD_HEX_LENGTH.AMOUNT, "0");
  }

  // Add salt as hex string
  hex += signedWill.salt.toString(16).padStart(FIELD_HEX_LENGTH.SALT, "0");

  // Add will address (remove 0x prefix)
  hex += signedWill.will.slice(2);

  // Add permit2 data
  hex += signedWill.permit2.nonce
    .toString(16)
    .padStart(FIELD_HEX_LENGTH.NONCE, "0");
  hex += signedWill.permit2.deadline.toString(16).padStart(16, "0");
  // Add signature (remove 0x prefix)
  hex += signedWill.permit2.signature
    .slice(2)
    .padStart(FIELD_HEX_LENGTH.SIGNATURE, "0");

  console.log(chalk.green("✅ Serialized successfully"));

  return {
    hex,
  };
}

/**
 * Process will serialization workflow
 */
async function processWillSerialization(): Promise<ProcessResult> {
  try {
    const signedWill: SignedWill = readWill(WILL_TYPE.SIGNED);

    console.log(chalk.blue("Serializing signed will..."));

    const serializedWill: SerializedWill = serializeWill(signedWill);

    saveWill(WILL_TYPE.SERIALIZED, serializedWill);

    console.log(
      chalk.green.bold(
        "\n🎉 Will serialization process completed successfully!",
      ),
    );

    return {
      ...serializedWill,
      serializedWillPath: PATHS_CONFIG.will.serialized,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will serializing process:"),
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
    console.log(chalk.bgCyan("\n=== Signed Will Serialization ===\n"));

    const result = await processWillSerialization();

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

export { serializeWill, processWillSerialization };
