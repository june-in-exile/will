import {
  PATHS_CONFIG,
  VALIDATION_CONFIG,
  PERMIT2_CONFIG,
  NETWORK_CONFIG,
} from "@shared/config.js";
import { updateEnvVariable } from "@shared/utils/env/";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { ethers, JsonRpcProvider, Wallet, Network } from "ethers";
import { config } from "dotenv";
import { createRequire } from "module";
import chalk from "chalk";

const require = createRequire(import.meta.url);

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Load Permit2 SDK
const permit2SDK = require("@uniswap/permit2-sdk");
const { SignatureTransfer } = permit2SDK;

// Type definitions
interface EnvironmentVariables {
  TESTATOR_PRIVATE_KEY: string;
  PERMIT2: string;
}

interface Estate {
  token: string;
  amount: string;
  beneficiary: string;
}

interface TestamentData {
  testator: string;
  estates: Estate[];
  testament: string;
}

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

interface SignatureInfo {
  nonce: number;
  deadline: number;
  signature: string;
}

interface SignedTestamentData extends TestamentData {
  signature: SignatureInfo;
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
function validateEnvironment(): EnvironmentVariables {
  const { TESTATOR_PRIVATE_KEY, PERMIT2 } = process.env;

  if (!TESTATOR_PRIVATE_KEY) {
    throw new Error("Environment variable TESTATOR_PRIVATE_KEY is not set");
  }

  if (
    TESTATOR_PRIVATE_KEY.length !== 64 &&
    TESTATOR_PRIVATE_KEY.length !== 66
  ) {
    throw new Error("Invalid private key format");
  }

  const permit2Address = PERMIT2 || permit2SDK.PERMIT2;
  if (!permit2Address) {
    throw new Error("PERMIT2 not found in environment or SDK");
  }

  if (!ethers.isAddress(permit2Address)) {
    throw new Error(`Invalid PERMIT2: ${permit2Address}`);
  }

  return { TESTATOR_PRIVATE_KEY, PERMIT2: permit2Address };
}

/**
 * Validate file existence
 */
function validateFiles(): void {
  if (!existsSync(PATHS_CONFIG.testament.addressed)) {
    throw new Error(
      `Addressed testament file does not exist: ${PATHS_CONFIG.testament.addressed}`
    );
  }
}

/**
 * Create and validate signer
 */
async function createSigner(
  privateKey: string,
  provider: JsonRpcProvider
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
 * Validate network connection and get chain info
 */
async function validateNetwork(provider: JsonRpcProvider): Promise<Network> {
  try {
    console.log(chalk.blue("Validating network connection..."));
    const network = await provider.getNetwork();

    console.log(chalk.green("✅ Connected to network:"), network.name);
    console.log(chalk.gray("Chain ID:"), network.chainId.toString());

    return network;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to connect to network: ${errorMessage}`);
  }
}

/**
 * Read and validate testament data
 */
function readTestamentData(): TestamentData {
  try {
    console.log(chalk.blue("Reading addressed testament data..."));
    const testamentContent = readFileSync(
      PATHS_CONFIG.testament.addressed,
      "utf8"
    );
    const testamentJson: TestamentData = JSON.parse(testamentContent);

    // Validate required fields
    const requiredFields: (keyof TestamentData)[] = [
      "testament",
      "estates",
      "testator",
    ];
    for (const field of requiredFields) {
      if (!testamentJson[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate testament address
    if (!ethers.isAddress(testamentJson.testament)) {
      throw new Error(`Invalid testament address: ${testamentJson.testament}`);
    }

    // Validate estates
    if (
      !Array.isArray(testamentJson.estates) ||
      testamentJson.estates.length <
        VALIDATION_CONFIG.testament.minEstatesRequired
    ) {
      throw new Error(
        `Invalid estates array or insufficient estates (minimum: ${VALIDATION_CONFIG.testament.minEstatesRequired})`
      );
    }

    // Validate each estate
    testamentJson.estates.forEach((estate, index) => {
      const requiredEstateFields: (keyof Estate)[] = [
        "token",
        "amount",
        "beneficiary",
      ];
      for (const field of requiredEstateFields) {
        if (!estate[field]) {
          throw new Error(
            `Missing required field '${field}' in estate ${index}`
          );
        }
      }

      if (!ethers.isAddress(estate.token)) {
        throw new Error(
          `Invalid token address in estate ${index}: ${estate.token}`
        );
      }

      if (!ethers.isAddress(estate.beneficiary)) {
        throw new Error(
          `Invalid beneficiary address in estate ${index}: ${estate.beneficiary}`
        );
      }

      // Validate amount is a valid number
      try {
        BigInt(estate.amount);
      } catch {
        throw new Error(`Invalid amount in estate ${index}: ${estate.amount}`);
      }
    });

    console.log(chalk.green("✅ Testament data validated successfully"));
    console.log(chalk.gray("Estates count:"), testamentJson.estates.length);
    console.log(chalk.gray("Testament address:"), testamentJson.testament);

    return testamentJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in testament file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Calculate deadline timestamp
 */
function calculateDeadline(
  durationMs: number = PERMIT2_CONFIG.defaultDuration
): number {
  const endTimeMs = Date.now() + durationMs;
  const endTimeSeconds = Math.floor(endTimeMs / 1000);

  console.log(
    chalk.gray("Signature valid until:"),
    new Date(endTimeMs).toISOString()
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
  testamentAddress: string,
  nonce: number,
  deadline: number
): Permit {
  try {
    console.log(chalk.blue("Creating permit structure..."));

    const permitted: PermittedToken[] = estates.map((estate, index) => {
      console.log(chalk.gray(`Estate ${index}:`), {
        token: estate.token,
        amount: estate.amount,
        beneficiary: estate.beneficiary,
      });

      return {
        token: estate.token,
        amount: BigInt(estate.amount),
      };
    });

    const permit: Permit = {
      permitted,
      spender: testamentAddress,
      nonce,
      deadline,
    };

    console.log(chalk.green("✅ Permit structure created"));
    console.log(chalk.gray("Spender (Testament):"), testamentAddress);
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
  signer: Wallet
): Promise<string> {
  try {
    console.log(chalk.blue("Generating EIP-712 signature..."));

    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      permit2Address,
      chainId
    );

    console.log(chalk.gray("Domain:"), domain.name, `(v${domain.version})`);
    console.log(chalk.gray("Chain ID:"), chainId.toString());

    const signature = await signer.signTypedData(domain, types, values);

    console.log(chalk.green("✅ Signature generated successfully"));
    console.log(
      chalk.gray("Signature:"),
      `${signature.substring(0, 10)}...${signature.substring(signature.length - 8)}`
    );

    return signature;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to sign permit: ${errorMessage}`);
  }
}

/**
 * Save signed testament
 */
function saveSignedTestament(
  testamentData: TestamentData,
  nonce: number,
  deadline: number,
  signature: string
): SignedTestamentData {
  try {
    console.log(chalk.blue("Preparing signed testament..."));

    const signedTestament = {
      ...testamentData,
      signature: {
        nonce,
        deadline,
        signature,
      },
    };

    writeFileSync(
      PATHS_CONFIG.testament.signed,
      JSON.stringify(signedTestament, null, 4)
    );
    console.log(
      chalk.green("✅ Signed testament saved to:"),
      PATHS_CONFIG.testament.signed
    );

    return signedTestament;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save signed testament: ${errorMessage}`);
  }
}

/**
 * Update environment variables
 */
async function updateEnvironmentVariables(
  nonce: number,
  deadline: number,
  signature: string
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["NONCE", nonce.toString()],
      ["DEADLINE", deadline.toString()],
      ["PERMIT2_SIGNATURE", signature],
    ];

    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value))
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update environment variables: ${errorMessage}`);
  }
}

/**
 * Process testament signing workflow
 */
async function processTestamentSigning(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { TESTATOR_PRIVATE_KEY, PERMIT2 } = validateEnvironment();

    // Initialize provider and validate network
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    const network = await validateNetwork(provider);

    // Create and validate signer
    const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

    // Read and validate testament data
    const testamentData = readTestamentData();

    // Generate signature parameters
    console.log(chalk.blue("Generating signature parameters..."));
    const nonce = generateSecureNonce();
    const deadline = calculateDeadline();

    console.log(chalk.gray("Signature parameters:"));
    console.log(chalk.gray("- Nonce:"), nonce);
    console.log(chalk.gray("- Deadline:"), deadline);
    console.log(
      chalk.gray("- Valid until:"),
      new Date(deadline * 1000).toISOString()
    );

    // Create permit structure
    const permit = createPermitStructure(
      testamentData.estates,
      testamentData.testament,
      nonce,
      deadline
    );

    // Sign the permit
    const signature = await signPermit(
      permit,
      PERMIT2,
      network.chainId,
      signer
    );

    // Save signed testament
    saveSignedTestament(testamentData, nonce, deadline, signature);

    // Update environment variables
    await updateEnvironmentVariables(nonce, deadline, signature);

    console.log(
      chalk.green.bold("\n🎉 Testament signing process completed successfully!")
    );

    return {
      nonce,
      deadline,
      signature,
      estatesCount: testamentData.estates.length,
      outputPath: PATHS_CONFIG.testament.signed,
      signerAddress: await signer.getAddress(),
      chainId: network.chainId.toString(),
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during testament signing process:"),
      errorMessage
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
      chalk.cyan("\n=== Testament EIP-712 Signature Generation ===\n")
    );

    const result = await processTestamentSigning();

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
      errorMessage
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
