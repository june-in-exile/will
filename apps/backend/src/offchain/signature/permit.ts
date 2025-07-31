import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import type { TransferSigning } from "@shared/types/environment.js";
import { PATHS_CONFIG, PERMIT2_CONFIG, NETWORK_CONFIG } from "@config";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { Estate } from "@shared/types/blockchain.js";
import { WillFileType, type AddressedWill, type SignedWill } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { saveWill } from "@shared/utils/file/saveWill.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { createSigner } from "@shared/utils/blockchain.js";
import { generateSecureNonce } from "@shared/utils/cryptography/nonce.js"
import { truncate } from "@shared/utils/transform/expression.js";
import { JsonRpcProvider, Wallet } from "ethers";
import { createRequire } from "module";
import chalk from "chalk";

const require = createRequire(import.meta.url);

// Load Permit2 SDK
const permit2SDK = require("@uniswap/permit2-sdk");
const { SignatureTransfer } = permit2SDK;

interface PermittedToken {
  token: string;
  amount: bigint;
}

interface Permit {
  permitted: PermittedToken[];
  spender: string;
  nonce: number;
  deadline: number;
}

interface ProcessResult {
  nonce: number;
  deadline: number;
  signature: string;
  signerAddress: string;
  chainId: string;
  outputPath: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): TransferSigning {
  const result = validateEnvironment<TransferSigning>(
    presetValidations.transferSigning(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  // Handle default PERMIT2 address from SDK if not provided
  if (!result.data.PERMIT2) {
    result.data.PERMIT2 = permit2SDK.PERMIT2;
  }

  return result.data;
}

/**
 * Calculate deadline timestamp
 */
function calculateDeadline(
  durationMs: number = PERMIT2_CONFIG.defaultDuration,
): number {
  console.log(chalk.blue("Calculating deadline..."));

  const endTimeMs = Date.now() + durationMs;
  const endTimeSeconds = Math.floor(endTimeMs / 1000);

  console.log(
    chalk.gray("Signature valid until:"),
    new Date(endTimeSeconds * 1000).toISOString(),
  );
  return endTimeSeconds;
}

/**
 * Create permit structure for signing
 */
function createPermitStructure(
  estates: Estate[],
  willAddress: string,
  nonce: number,
  deadline: number,
): Permit {
  try {
    console.log(chalk.blue("Creating permit structure..."));

    const permitted: PermittedToken[] = estates.map((estate) => {
      return {
        token: estate.token,
        amount: estate.amount,
      };
    });

    const permit: Permit = {
      permitted,
      spender: willAddress,
      nonce,
      deadline,
    };

    console.log(chalk.green("✅ Permit structure created"));
    return permit;
  } catch (error) {
    throw new Error(`Failed to create permit structure: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Print detailed Permit information
 */
function printPermit(permit: Permit): void {
  console.log(chalk.cyan("\n=== Permit Details ===\n"));

  permit.permitted.forEach((estate, index) => {
    console.log(chalk.gray(`Estate ${index}:`), {
      token: estate.token,
      amount: estate.amount,
    });
  });
  console.log(chalk.gray("Spender (Will):"), permit.spender);
  console.log(chalk.gray("- Nonce:"), permit.nonce);
  console.log(chalk.gray(`- Deadline: ${permit.deadline} (${new Date(permit.deadline * 1000).toISOString()})`));

  console.log(chalk.cyan("\n=== End of Permit Details ===\n"));
}

/**
 * Sign permit using EIP-712
 */
async function signPermit(
  permit: Permit,
  permit2Address: string,
  chainId: bigint,
  signer: Wallet,
): Promise<string> {
  try {
    console.log(chalk.blue("Generating EIP-712 signature..."));

    printPermit(permit)

    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      permit2Address,
      chainId,
    );

    const signature = await signer.signTypedData(domain, types, values);

    console.log(chalk.green("✅ Signature generated successfully"));
    console.log(
      chalk.gray("Signature:"), truncate(signature)
    );

    return signature;
  } catch (error) {
    throw new Error(`Failed to sign permit: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Process will signing workflow
 */
async function processPermitSigning(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    const { TESTATOR_PRIVATE_KEY, PERMIT2 } = validateEnvironmentVariables();

    // Initialize provider and validate network
    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    const network = await validateNetwork(provider);

    // Create and validate signer
    const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

    // Read and validate will data
    const willData: AddressedWill = readWill(WillFileType.ADDRESSED);

    // Generate signature parameters
    console.log(chalk.blue("Generating signature parameters..."));
    const nonce = generateSecureNonce();
    const deadline = calculateDeadline();

    // Create permit structure
    const permit = createPermitStructure(
      willData.estates,
      willData.will,
      nonce,
      deadline,
    );

    // Sign the permit
    const signature = await signPermit(
      permit,
      PERMIT2,
      network.chainId,
      signer,
    );

    const signedWillData: SignedWill = {
      ...willData,
      signature: {
        nonce,
        deadline,
        signature,
      },
    }

    // Save signed will
    saveWill(WillFileType.SIGNED, signedWillData)

    // Update environment variables
    await updateEnvironmentVariables([
      ["NONCE", nonce.toString()],
      ["DEADLINE", deadline.toString()],
      ["PERMIT2_SIGNATURE", signature],
    ]);

    console.log(
      chalk.green.bold("\n🎉 Will signing process completed successfully!"),
    );

    return {
      nonce,
      deadline,
      signature,
      signerAddress: await signer.getAddress(),
      chainId: network.chainId.toString(),
      outputPath: PATHS_CONFIG.will.signed,
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
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Permit2 Signature Generation ===\n"));

    const result = await processPermitSigning();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      signature: `${result.signature.substring(0, 10)}...${result.signature.substring(result.signature.length - 8)}`,
    });
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
  calculateDeadline,
  createPermitStructure,
  signPermit,
  processPermitSigning as processWillSigning,
};
