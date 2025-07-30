import type { SubmitProof } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { readProof } from "@shared/utils/file/readProof.js";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import {
  Groth16Verifier,
  Groth16Verifier__factory,
} from "@shared/types/typechain-types/index.js";
import type { ProofData } from "@shared/types/crypto.js";
import { validateFiles } from "@shared/utils/validation/file.js"
import { validateNetwork } from "@shared/utils/validation/network.js";
import { createContractInstance } from "@shared/utils/crypto/blockchain.js";
import { JsonRpcProvider } from "ethers";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

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
function validateEnvironmentVariables(): SubmitProof {
  const result = validateEnvironment<SubmitProof>(presetValidations.submitProof());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
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
    validateFiles([
      PATHS_CONFIG.zkp.multiplier2.proof,
      PATHS_CONFIG.zkp.multiplier2.public,
    ]);
    const { UPLOAD_CID_VERIFIER } = validateEnvironmentVariables();

    // Initialize provider and validate connection
    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    // Create contract instance
    const contract = await createContractInstance<Groth16Verifier>(
      UPLOAD_CID_VERIFIER,
      Groth16Verifier__factory,
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

export {
  validateEnvironmentVariables,
  printProofData,
  submitProofToContract,
  processProofSubmission
}