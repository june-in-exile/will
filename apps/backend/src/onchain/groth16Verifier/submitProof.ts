import { PATHS_CONFIG, NETWORK_CONFIG, CONFIG_UTILS } from "@config";
import { readProof } from "@util/index.js";
import {
  Groth16Verifier,
  Groth16Verifier__factory,
  type ProofData,
} from "@type/index.js";
import { existsSync } from "fs";
import { ethers, JsonRpcProvider, Network } from "ethers";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
  UPLOAD_CID_VERIFIER: string;
}

interface ProofSubmissionResult {
  isValid: boolean;
  contractAddress: string;
  submittedAt: number;
  success: boolean;
}

interface ProofValidationResult {
  proofValid: boolean;
  gasUsed?: bigint;
  executionTime: number;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
  try {
    console.log(chalk.blue("Validating environment..."));
    CONFIG_UTILS.validateEnvironment();

    if (CONFIG_UTILS.isUsingAnvil()) {
      console.log(chalk.gray("Using Anvil for local development"));
    }

    const { UPLOAD_CID_VERIFIER } = process.env;

    if (!UPLOAD_CID_VERIFIER) {
      throw new Error("Environment variable UPLOAD_CID_VERIFIER is not set");
    }

    console.log(chalk.green("✅ Environment validated"));

    return { UPLOAD_CID_VERIFIER };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to validate the environment: ${errorMessage}`);
  }
}

/**
 * Validate required files
 */
function validateFiles(): void {
  const requiredFiles = [
    PATHS_CONFIG.zkp.multiplier2.proof,
    PATHS_CONFIG.zkp.multiplier2.public,
  ];

  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      throw new Error(`Required file does not exist: ${filePath}`);
    }
  }

  console.log(chalk.green("✅ Required files validated"));
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
 * Create contract instance with validation
 */
async function createContractInstance(
  verifierAddress: string,
  provider: JsonRpcProvider,
): Promise<Groth16Verifier> {
  try {
    console.log(chalk.blue("Loading Groth16 verifier contract..."));

    const contract = Groth16Verifier__factory.connect(
      verifierAddress,
      provider,
    );

    // Validate contract exists at address
    const code = await provider.getCode(verifierAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${verifierAddress}`);
    }

    console.log(chalk.green("✅ Groth16 verifier contract loaded"));
    console.log(chalk.gray("Contract address:"), verifierAddress);

    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create contract instance: ${errorMessage}`);
  }
}

/**
 * Print detailed proof information
 */
function printProofData(proof: ProofData): void {
  console.log(chalk.cyan("\n=== Zero-Knowledge Proof Details ==="));

  console.log(chalk.blue("\n🔐 Proof Components:"));
  console.log(chalk.gray("- pA[0]:"), chalk.white(proof.pA[0].toString()));
  console.log(chalk.gray("- pA[1]:"), chalk.white(proof.pA[1].toString()));
  console.log(
    chalk.gray("- pB[0][0]:"),
    chalk.white(proof.pB[0][0].toString()),
  );
  console.log(
    chalk.gray("- pB[0][1]:"),
    chalk.white(proof.pB[0][1].toString()),
  );
  console.log(
    chalk.gray("- pB[1][0]:"),
    chalk.white(proof.pB[1][0].toString()),
  );
  console.log(
    chalk.gray("- pB[1][1]:"),
    chalk.white(proof.pB[1][1].toString()),
  );
  console.log(chalk.gray("- pC[0]:"), chalk.white(proof.pC[0].toString()));
  console.log(chalk.gray("- pC[1]:"), chalk.white(proof.pC[1].toString()));

  console.log(chalk.blue("\n📊 Public Signals:"));
  proof.pubSignals.forEach((signal, index) => {
    console.log(
      chalk.gray(`- pubSignal[${index}]:`),
      chalk.white(signal.toString()),
    );
  });

  console.log(chalk.cyan("\n=== End of Proof Details ===\n"));
}

/**
 * Submit proof to verifier contract
 */
async function submitProofToContract(
  contract: Groth16Verifier,
  proof: ProofData,
): Promise<ProofValidationResult> {
  try {
    console.log(chalk.blue("Submitting proof for verification..."));

    // Print detailed proof information
    printProofData(proof);

    const startTime = Date.now();

    // Call the verifyProof function (this is a view function, so no gas cost)
    const isValid = await contract.verifyProof(
      proof.pA,
      proof.pB,
      proof.pC,
      proof.pubSignals,
    );

    const executionTime = Date.now() - startTime;

    if (isValid) {
      console.log(chalk.green("✅ Proof verification successful!"));
      console.log(chalk.green("🎉 Zero-knowledge proof is VALID"));
    } else {
      console.log(chalk.red("❌ Proof verification failed!"));
      console.log(chalk.red("💥 Zero-knowledge proof is INVALID"));
    }

    console.log(chalk.gray("Verification time:"), `${executionTime}ms`);

    return {
      proofValid: isValid,
      executionTime,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Error during proof submission:"), errorMessage);
    throw new Error(`Failed to submit proof: ${errorMessage}`);
  }
}

/**
 * Process proof submission workflow
 */
async function processProofSubmission(): Promise<ProofSubmissionResult> {
  try {
    // Validate prerequisites
    validateFiles();
    const { UPLOAD_CID_VERIFIER } = validateEnvironment();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create contract instance
    const contract = await createContractInstance(
      UPLOAD_CID_VERIFIER,
      provider,
    );

    // Read and validate proof data
    const proof = readProof();

    // Submit proof for verification
    const verificationResult = await submitProofToContract(contract, proof);

    const result: ProofSubmissionResult = {
      isValid: verificationResult.proofValid,
      contractAddress: UPLOAD_CID_VERIFIER,
      submittedAt: Date.now(),
      success: true,
    };

    console.log(
      chalk.green.bold("\n🎉 Proof submission process completed successfully!"),
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during proof submission process:"),
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
    console.log(chalk.cyan("\n=== Zero-Knowledge Proof Submission ===\n"));

    const result = await processProofSubmission();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(
      chalk.gray("- Proof Valid:"),
      result.isValid ? chalk.green("✅ YES") : chalk.red("❌ NO"),
    );
    console.log(chalk.gray("- Contract Address:"), result.contractAddress);
    console.log(
      chalk.gray("- Submitted At:"),
      new Date(result.submittedAt).toISOString(),
    );

    if (!result.isValid) {
      console.log(
        chalk.yellow("\n⚠️  Proof verification failed. Please check:"),
      );
      console.log(chalk.gray("1. Proof generation process"));
      console.log(chalk.gray("2. Public signal consistency"));
      console.log(chalk.gray("3. Circuit parameters"));
      console.log(chalk.gray("4. Verifier contract compatibility"));
    }
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
