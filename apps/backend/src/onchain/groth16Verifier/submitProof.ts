import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import {
  Multiplier2Verifier,
  Multiplier2Verifier__factory,
  CidUploadVerifier,
  CidUploadVerifier__factory,
  WillCreationVerifier,
  WillCreationVerifier__factory,
} from "@shared/types/typechain-types/index.js";
import type { ProofData, SubmitProof } from "@shared/types/index.js";
import { readProof } from "@shared/utils/file/readProof.js";
import {
  validateFiles,
  validateEnvironment,
  presetValidations,
  validateNetwork,
} from "@shared/utils/validation/index.js";
import { createContract } from "@shared/utils/blockchain.js";
import { printProof } from "@shared/utils/print.js";
import { JsonRpcProvider } from "ethers";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";
import readline from "readline";

interface ProcessResult {
  proofValid: boolean;
  submittedTime: number;
  executionTime: number;
}

/**
 * Display menu and get circuit selection from user
 */
async function selectCircuit(): Promise<keyof typeof PATHS_CONFIG.zkp> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askForInput = () => {
      console.log(chalk.cyan("\n🔧 Select a circuit to verify:"));
      console.log(chalk.white("1. multiplier2"));
      console.log(chalk.white("2. cidUpload"));
      console.log(chalk.white("3. willCreation"));
      console.log(chalk.gray("Enter your choice (1-3): "));

      rl.question("", (answer) => {
        switch (answer.trim()) {
          case "1":
            rl.close();
            resolve("multiplier2");
            break;
          case "2":
            rl.close();
            resolve("cidUpload");
            break;
          case "3":
            rl.close();
            resolve("willCreation");
            break;
          default:
            console.log(chalk.red("❌ Invalid selection. Please choose 1, 2, or 3."));
            askForInput();
            break;
        }
      });
    };

    askForInput();
  });
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
 * 
 * @note This function is kept only for debugging purpose
 */
async function executeProofSubmission(
  contract: Multiplier2Verifier,
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
async function processProofSubmission(circuitName: keyof typeof PATHS_CONFIG.zkp): Promise<ProcessResult> {
  const circuitFiles = PATHS_CONFIG.zkp[circuitName];

  try {
    validateFiles([
      circuitFiles.proof,
      circuitFiles.public,
    ]);
    const { CID_UPLOAD_VERIFIER, WILL_CREATION_VERIFIER } = validateEnvironmentVariables();

    if (!CID_UPLOAD_VERIFIER && !WILL_CREATION_VERIFIER) {
      throw new Error("No verifier address available in .env");
    }

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    let contract;
    switch (circuitName) {
      case "multiplier2":
        contract = await createContract<Multiplier2Verifier>(
          (CID_UPLOAD_VERIFIER ? CID_UPLOAD_VERIFIER : WILL_CREATION_VERIFIER)!,
          Multiplier2Verifier__factory,
          provider,
        );
        break;
      case "cidUpload":
        if (!CID_UPLOAD_VERIFIER) throw new Error(`CID_UPLOAD_VERIFIER not available`);
        contract = await createContract<CidUploadVerifier>(
          CID_UPLOAD_VERIFIER,
          CidUploadVerifier__factory,
          provider,
        );
        break;
      case "willCreation":
        if (!WILL_CREATION_VERIFIER) throw new Error(`WILL_CREATION_VERIFIER not available`);
        contract = await createContract<WillCreationVerifier>(
          WILL_CREATION_VERIFIER,
          WillCreationVerifier__factory,
          provider,
        );
        break;
      default:
        throw new Error(`Unsupported circuit name: ${circuitName}`);
    }
    console.log("contract:", contract);

    const proof = readProof(circuitName);

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

    const selectedCircuit = await selectCircuit();
    const result = await processProofSubmission(selectedCircuit);

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
