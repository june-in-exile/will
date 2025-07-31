import type { SubmitProof } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { readProof } from "@shared/utils/file/readProof.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import {
  Groth16Verifier,
  Groth16Verifier__factory,
} from "@shared/types/typechain-types/index.js";
import type { ProofData } from "@shared/types/crypto.js";
import { validateFiles } from "@shared/utils/validation/file.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { createContractInstance } from "@shared/utils/blockchain.js";
import { printProof } from "@shared/utils/print.js";
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface ProofValidationResult {
  proofValid: boolean;
  gasUsed?: bigint;
  executionTime: number;
}

interface ProcessResult {
  isValid: boolean;
  contractAddress: string;
  submittedAt: number;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): SubmitProof {
  const result = validateEnvironment<SubmitProof>(
    presetValidations.submitProof(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
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
    printProof(proof);

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
    throw new Error(`Failed to submit proof: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Process proof submission workflow
 */
async function processProofSubmission(): Promise<ProcessResult> {
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

    const result: ProcessResult = {
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
    throw new Error(`Failed to submit proof: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Zero-Knowledge Proof Submission ===\n"));

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
  submitProofToContract,
  processProofSubmission,
};
