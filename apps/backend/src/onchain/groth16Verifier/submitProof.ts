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
import { createContract } from "@shared/utils/blockchain.js";
import { printProof } from "@shared/utils/print.js";
import { JsonRpcProvider } from "ethers";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult {
  proofValid: boolean;
  submittedTime: number;
  executionTime: number;
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
async function executeProofSubmission(
  contract: Groth16Verifier,
  proof: ProofData,
): Promise<ProcessResult> {
  try {
    console.log(chalk.blue("Submitting proof for verification..."));

    printProof(proof);

    const submittedTime = Date.now();

    const proofValid = await contract.verifyProof(
      proof.pA,
      proof.pB,
      proof.pC,
      proof.pubSignals,
    );

    const executionTime = Date.now() - submittedTime;

    if (proofValid) {
      console.log(chalk.green("✅ Proof verification successful!"));
      console.log(chalk.green("🎉 Zero-knowledge proof is VALID"));
    } else {
      console.log(chalk.red("❌ Proof verification failed!"));
      console.log(chalk.red("💥 Zero-knowledge proof is INVALID"));
    }

    return {
      proofValid,
      submittedTime,
      executionTime,
    };
  } catch (error) {
    throw new Error(
      `Failed to submit proof: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process proof submission workflow
 */
async function processProofSubmission(): Promise<ProcessResult> {
  try {
    validateFiles([
      PATHS_CONFIG.zkp.multiplier2.proof,
      PATHS_CONFIG.zkp.multiplier2.public,
    ]);
    const { UPLOAD_CID_VERIFIER } = validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const contract = await createContract<Groth16Verifier>(
      UPLOAD_CID_VERIFIER,
      Groth16Verifier__factory,
      provider,
    );

    const proof = readProof();

    const result = await executeProofSubmission(contract, proof);

    console.log(
      chalk.green.bold("\n🎉 Proof submission process completed successfully!"),
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to submit proof: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
    console.log(chalk.gray("Results:"), {
      ...result,
      submittedTime: `${preview.timestamp(result.submittedTime)}`,
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
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { executeProofSubmission, processProofSubmission };
