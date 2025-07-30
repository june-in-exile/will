import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import type { TransferSigning } from "@shared/types/environment.js";
import {
  PATHS_CONFIG,
  PERMIT2_CONFIG,
  NETWORK_CONFIG,
} from "@config";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import { Estate } from "@shared/types/blockchain.js"
import { WillFileType, AddressedWillData, SignedWillData } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { writeFileSync } from "fs";
import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { config } from "dotenv";
import { createRequire } from "module";
import chalk from "chalk";

const require = createRequire(import.meta.url);

// Load environment configuration
config({ path: PATHS_CONFIG.env });

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
  estatesCount: number;
  outputPath: string;
  signerAddress: string;
  chainId: string;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): TransferSigning {
  const result = validateEnvironment<TransferSigning>(presetValidations.transferSigning());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  // Handle default PERMIT2 address from SDK if not provided
  if (!result.data.PERMIT2) {
    result.data.PERMIT2 = permit2SDK.PERMIT2;
  }

  return result.data;
}

/**
 * Create and validate signer
 */
async function createSigner(
  privateKey: string,
  provider: JsonRpcProvider,
): Promise<Wallet> {
  try {
    console.log(chalk.blue("Initializing signer..."));
    const signer = new ethers.Wallet(privateKey, provider);

    // Validate signer can connect
    const address = await signer.getAddress();
    const balance = await signer.provider!.getBalance(address);

    console.log(chalk.green("✅ Signer initialized:"), chalk.white(address));
    console.log(chalk.gray("Balance:"), ethers.formatEther(balance), "ETH");

    return signer;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create signer: ${errorMessage}`);
  }
}

/**
 * Calculate deadline timestamp
 */
function calculateDeadline(
  durationMs: number = PERMIT2_CONFIG.defaultDuration,
): number {
  const endTimeMs = Date.now() + durationMs;
  const endTimeSeconds = Math.floor(endTimeMs / 1000);

  console.log(
    chalk.gray("Signature valid until:"),
    new Date(endTimeMs).toISOString(),
  );
  return endTimeSeconds;
}

/**
 * Generate cryptographically secure nonce
 */
function generateSecureNonce(): number {
  // Use crypto.getRandomValues for better randomness than Math.random()
  const randomArray = new Uint32Array(2);
  crypto.getRandomValues(randomArray);

  // Combine two 32-bit values to get better distribution
  const nonce = (BigInt(randomArray[0]) << 32n) | BigInt(randomArray[1]);
  const nonceNumber = Number(nonce % BigInt(PERMIT2_CONFIG.maxNonceValue));

  console.log(chalk.gray("Generated nonce:"), nonceNumber);
  return nonceNumber;
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

    const permitted: PermittedToken[] = estates.map((estate, index) => {
      console.log(chalk.gray(`Estate ${index}:`), {
        beneficiary: estate.beneficiary,
        token: estate.token,
        amount: estate.amount,
      });

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
    console.log(chalk.gray("Spender (Will):"), willAddress);
    console.log(chalk.gray("Permitted tokens:"), permitted.length);

    return permit;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create permit structure: ${errorMessage}`);
  }
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

    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      permit2Address,
      chainId,
    );

    console.log(chalk.gray("Domain:"), domain.name, `(v${domain.version})`);
    console.log(chalk.gray("Chain ID:"), chainId.toString());

    const signature = await signer.signTypedData(domain, types, values);

    console.log(chalk.green("✅ Signature generated successfully"));
    console.log(
      chalk.gray("Signature:"),
      `${signature.substring(0, 10)}...${signature.substring(signature.length - 8)}`,
    );

    return signature;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to sign permit: ${errorMessage}`);
  }
}

/**
 * Save signed will
 */
function saveSignedWill(
  willData: AddressedWillData,
  nonce: number,
  deadline: number,
  signature: string,
): SignedWillData {
  try {
    console.log(chalk.blue("Preparing signed will..."));

    const signedWill = {
      ...willData,
      signature: {
        nonce,
        deadline,
        signature,
      },
    };

    writeFileSync(
      PATHS_CONFIG.will.signed,
      JSON.stringify(signedWill, null, 4),
    );
    console.log(
      chalk.green("✅ Signed will saved to:"),
      PATHS_CONFIG.will.signed,
    );

    return signedWill;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save signed will: ${errorMessage}`);
  }
}

/**
 * Update environment variables
 */
async function updateEnvironmentVariables(
  nonce: number,
  deadline: number,
  signature: string,
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["NONCE", nonce.toString()],
      ["DEADLINE", deadline.toString()],
      ["PERMIT2_SIGNATURE", signature],
    ];

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
 * Process will signing workflow
 */
async function processWillSigning(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    const { TESTATOR_PRIVATE_KEY, PERMIT2 } = validateEnvironmentVariables();

    // Initialize provider and validate network
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    const network = await validateNetwork(provider);

    // Create and validate signer
    const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

    // Read and validate will data
    const willData: AddressedWillData = readWill(WillFileType.ADDRESSED);

    // Generate signature parameters
    console.log(chalk.blue("Generating signature parameters..."));
    const nonce = generateSecureNonce();
    const deadline = calculateDeadline();

    console.log(chalk.gray("Signature parameters:"));
    console.log(chalk.gray("- Nonce:"), nonce);
    console.log(chalk.gray("- Deadline:"), deadline);
    console.log(
      chalk.gray("- Valid until:"),
      new Date(deadline * 1000).toISOString(),
    );

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

    // Save signed will
    saveSignedWill(willData, nonce, deadline, signature);

    // Update environment variables
    await updateEnvironmentVariables(nonce, deadline, signature);

    console.log(
      chalk.green.bold("\n🎉 Will signing process completed successfully!"),
    );

    return {
      nonce,
      deadline,
      signature,
      estatesCount: willData.estates.length,
      outputPath: PATHS_CONFIG.will.signed,
      signerAddress: await signer.getAddress(),
      chainId: network.chainId.toString(),
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will signing process:"),
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
    console.log(chalk.cyan("\n=== Will EIP-712 Signature Generation ===\n"));

    const result = await processWillSigning();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      signature: `${result.signature.substring(0, 10)}...${result.signature.substring(result.signature.length - 8)}`,
    });
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
  createSigner,
  calculateDeadline,
  generateSecureNonce,
  createPermitStructure,
  signPermit,
  saveSignedWill,
  updateEnvironmentVariables,
  processWillSigning
}
