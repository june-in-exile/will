import { PATHS_CONFIG } from "@config";
import type {
    Estate,
    DecryptedWill,
    DeserializedWill,
    SerializedWill,
    EthereumAddress
} from "@shared/types/index.js";
import { WILL_TYPE } from "@shared/constants/will.js";
import { readWill, saveWill } from "@shared/utils/file/index.js";
import { validateWill } from "@shared/utils/validation/will.js";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult extends DeserializedWill {
    deserializedWillPath: string;
}

function readAddress(hex: string, start: number): { address: EthereumAddress; end: number } {
    const end = start + 40;
    const address = '0x' + hex.slice(start, start + 40) as EthereumAddress;
    return { address, end }
}

function readUntilSeparator(
    hex: string,
    offset: number,
    separator: string = ':'
): { hex: string; end: number } {
    let end = offset;
    while (end < hex.length && hex[end] !== separator) {
        end++;
    }

    const value = hex.slice(offset, end);
    end = end < hex.length ? end + 1 : end; // Skip separator if exists
    return { hex: value, end };
}

/**
 * Deserializes hex string back into will data object
 * @param serializedValue - The serialized hex string
 * @returns The deserialized (signed) will data object
 */
function deserializeWill(serializedWill: SerializedWill): DeserializedWill {
    const serializedHex = serializedWill.hex;

    const testatorStart = 0;
    const { address: testator, end: testatorEnd } = readAddress(serializedHex, testatorStart);

    const estateCountStart = testatorEnd;
    const { hex: estateCountHex, end: estateCountEnd } = readUntilSeparator(serializedHex, estateCountStart);
    const estateCount = parseInt(estateCountHex, 16);

    let estateStart = estateCountEnd;
    const estates: Estate[] = [];
    for (let i = 0; i < estateCount; i++) {
        const beneficiaryStart = estateStart;
        const { address: beneficiary, end: beneficiaryEnd } = readAddress(serializedHex, beneficiaryStart);

        const tokenStart = beneficiaryEnd;
        const { address: token, end: tokenEnd } = readAddress(serializedHex, tokenStart);

        const amountStart = tokenEnd;
        const { hex: amountHex, end: amountEnd } = readUntilSeparator(serializedHex, amountStart);
        const amount = BigInt('0x' + amountHex);

        estates.push({ beneficiary, token, amount });

        estateStart = amountEnd;
    }


    const saltStart = estateStart;
    const { hex: saltHex, end: saltEnd } = readUntilSeparator(serializedHex, saltStart);
    const salt = parseInt(saltHex, 16);

    const willStart = saltEnd;
    const { address: will, end: willEnd } = readAddress(serializedHex, willStart);

    const nonceStart = willEnd;
    const { hex: nonceHex, end: nonceEnd } = readUntilSeparator(serializedHex, nonceStart);
    const nonce = parseInt(nonceHex, 16);

    const deadlineStart = nonceEnd;
    const { hex: deadlineHex, end: deadlineEnd } = readUntilSeparator(serializedHex, deadlineStart);
    const deadline = parseInt(deadlineHex, 16);

    const signatureStart = deadlineEnd;
    const { hex: signatureHex } = readUntilSeparator(serializedHex, signatureStart);
    const signature = '0x' + signatureHex;
    console.log(`signature: ${signature}`)

    return {
        testator,
        estates,
        salt,
        will,
        permit2: {
            nonce,
            deadline,
            signature
        }
    };
}

/**
 * Process will serialization workflow
 */
async function processWillDeserialization(): Promise<ProcessResult> {
    try {
        const decryptedWill: DecryptedWill = readWill(WILL_TYPE.DECRYPTED);

        console.log(chalk.blue("Deserializing decrypted will..."));

        const deserializedWill: DeserializedWill = deserializeWill(decryptedWill)

        validateWill(WILL_TYPE.DESERIALIZED, deserializedWill)

        saveWill(WILL_TYPE.DESERIALIZED, deserializedWill)

        console.log(
            chalk.green.bold("\n🎉 Will deserialization process completed successfully!"),
        );

        return {
            ...deserializedWill,
            deserializedWillPath: PATHS_CONFIG.will.deserialized,
        };
    } catch (error) {
        console.error(
            chalk.red("Error during will signing process:"),
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
