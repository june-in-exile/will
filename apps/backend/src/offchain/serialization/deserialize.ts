import { PATHS_CONFIG } from "@config";
import type {
  Estate,
  DecryptedWill,
  DeserializedWill,
  SerializedWill,
  EthereumAddress,
} from "@shared/types/index.js";
import { WILL_TYPE, FIELD_HEX_LENGTH } from "@shared/constants/will.js";
import { readWill, saveWill } from "@shared/utils/file/index.js";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult extends DeserializedWill {
  deserializedWillPath: string;
}

function calculateEstateCount(hex: string): number {
  const perEstateLength =
    FIELD_HEX_LENGTH.BENEFICIARY +
    FIELD_HEX_LENGTH.TOKEN +
    FIELD_HEX_LENGTH.AMOUNT;
  const totalEstatesLength =
    hex.length -
    (FIELD_HEX_LENGTH.TESTATOR +
      FIELD_HEX_LENGTH.SALT +
      FIELD_HEX_LENGTH.WILL +
      FIELD_HEX_LENGTH.NONCE +
      FIELD_HEX_LENGTH.DEADLINE +
      FIELD_HEX_LENGTH.SIGNATURE);
  if (totalEstatesLength < 0 || totalEstatesLength % perEstateLength != 0) {
    throw new Error(`Invalid total estates length: ${totalEstatesLength}`);
  }
  return totalEstatesLength / perEstateLength;
}

function readBigInt(
  hex: string,
  start: number,
  length: number,
): { value: bigint; end: number } {
  const end = start + length;
  const valueHex = hex.slice(start, end);
  const value = BigInt("0x" + valueHex);
  return { value, end };
}

function readAddress(
  hex: string,
  start: number,
): { address: EthereumAddress; end: number } {
  const end = start + 40;
  const address = ("0x" + hex.slice(start, end)) as EthereumAddress;
  return { address, end };
}

/**
 * Deserializes hex string back into will data object
 * @param serializedValue - The serialized hex string
 * @returns The deserialized (signed) will data object
 */
function deserializeWill(serializedWill: SerializedWill): DeserializedWill {
  const serializedHex = serializedWill.hex;

  const testatorStart = 0;
  const { address: testator, end: testatorEnd } = readAddress(
    serializedHex,
    testatorStart,
  );

  const estateCount = calculateEstateCount(serializedHex);

  let estateStart = testatorEnd;
  const estates: Estate[] = [];
  for (let i = 0; i < estateCount; i++) {
    const beneficiaryStart = estateStart;
    const { address: beneficiary, end: beneficiaryEnd } = readAddress(
      serializedHex,
      beneficiaryStart,
    );

    const tokenStart = beneficiaryEnd;
    const { address: token, end: tokenEnd } = readAddress(
      serializedHex,
      tokenStart,
    );

    const amountStart = tokenEnd;
    const { value: amount, end: amountEnd } = readBigInt(
      serializedHex,
      amountStart,
      FIELD_HEX_LENGTH.AMOUNT,
    );

    estates.push({ beneficiary, token, amount });

    estateStart = amountEnd;
  }

  const saltStart = estateStart;
  const { value: salt, end: saltEnd } = readBigInt(
    serializedHex,
    saltStart,
    FIELD_HEX_LENGTH.SALT,
  );

  const willStart = saltEnd;
  const { address: will, end: willEnd } = readAddress(serializedHex, willStart);

  const nonceStart = willEnd;
  const { value: nonce, end: nonceEnd } = readBigInt(
    serializedHex,
    nonceStart,
    FIELD_HEX_LENGTH.NONCE,
  );

  const deadlineStart = nonceEnd;
  const { value: deadlineBigInt, end: deadlineEnd } = readBigInt(
    serializedHex,
    deadlineStart,
    FIELD_HEX_LENGTH.DEADLINE,
  );
  const deadline = Number(deadlineBigInt);

  const signatureStart = deadlineEnd;
  const signatureEnd = signatureStart + FIELD_HEX_LENGTH.SIGNATURE;
  const signature = "0x" + serializedHex.slice(signatureStart, signatureEnd);

  const deserializedWill = {
    testator,
    estates,
    salt,
    will,
    permit2: {
      nonce,
      deadline,
      signature,
    },
  };

  return deserializedWill;
}

/**
 * Process will serialization workflow
 */
async function processWillDeserialization(): Promise<ProcessResult> {
  try {
    const decryptedWill: DecryptedWill = readWill(WILL_TYPE.DECRYPTED);

    console.log(chalk.blue("Deserializing decrypted will..."));

    const deserializedWill: DeserializedWill = deserializeWill(decryptedWill);

    saveWill(WILL_TYPE.DESERIALIZED, deserializedWill);

    console.log(
      chalk.green.bold(
        "\n🎉 Will deserialization process completed successfully!",
      ),
    );

    return {
      ...deserializedWill,
      deserializedWillPath: PATHS_CONFIG.will.deserialized,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will deserializing process:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

/**
 * Main function - decide which method to use based on environment
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Decrypted Will Deserialization ===\n"));

    const result = await processWillDeserialization();

    console.log(chalk.green.bold("✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      permit2: {
        nonce: result.permit2.nonce,
        deadline: `${preview.timestamp(result.permit2.deadline * 1000)}`,
        signature: `${preview.longString(result.permit2.signature)}`,
      },
    });
  } catch (error) {
    console.error(
      chalk.red.bold("❌ Program execution failed:"),
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
  main().catch((error: Error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { deserializeWill, processWillDeserialization };
