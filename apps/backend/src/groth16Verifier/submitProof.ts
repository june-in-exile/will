import { NETWORK_CONFIG } from "@shared/config.js";
import { readProof } from "@shared/utils/read";
import { bigintToBase32 } from "@shared/utils/format";
import { ProofData } from "@shared/types";
import {
  Groth16Verifier,
  Groth16Verifier__factory
} from "@shared/types";
import { ethers, JsonRpcProvider } from "ethers";
import chalk from "chalk";

export interface FormattedProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: [string];
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(
  groth16verifierAddress: string,
  provider: JsonRpcProvider,
): Promise<Groth16Verifier> {
  try {
    console.log(chalk.blue("Loading Groth16 verifier contract..."));

    const contract = Groth16Verifier__factory.connect(
      groth16verifierAddress,
      provider,
    );

    // Validate contract exists at address
    const code = await provider.getCode(groth16verifierAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${groth16verifierAddress}`);
    }

    console.log(chalk.green("✅ Groth16 verifier contract loaded"));
    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create contract instance: ${errorMessage}`);
  }
}

function formatProof(proof: ProofData): FormattedProofData {
  const formattedProof: FormattedProofData = {
    pA: [
      bigintToBase32(proof.pA[0], "pA[0]"),
      bigintToBase32(proof.pA[1], "pA[1]")
    ] as [string, string],

    pB: [
      [
        bigintToBase32(proof.pB[0][0], "pB[0][0]"),
        bigintToBase32(proof.pB[0][1], "pB[0][1]")
      ],
      [
        bigintToBase32(proof.pB[1][0], "pB[1][0]"),
        bigintToBase32(proof.pB[1][1], "pB[1][1]")
      ]
    ] as [[string, string], [string, string]],

    pC: [
      bigintToBase32(proof.pC[0], "pC[0]"),
      bigintToBase32(proof.pC[1], "pC[1]")
    ] as [string, string],

    pubSignals: [
      bigintToBase32(proof.pubSignals[0], "pubSignals[0]"),
    ] as [string],
  };

  console.log(chalk.blue("Formatted proof structure:"));
  console.log(JSON.stringify(formattedProof, null, 2));

  return formattedProof;
}

async function submitProof(
  contract: Groth16Verifier,
  formattedProof: FormattedProofData
) {
  try {
    const result = await contract.verifyProof(
      formattedProof.pA,
      formattedProof.pB,
      formattedProof.pC,
      formattedProof.pubSignals,
    );
    console.log(chalk.green("✅ Verification result:", result));
  } catch (error) {
    console.error("Error submitting proof:", error);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Testament CID Upload ===\n"));

    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);

    const { EXECUTOR_PRIVATE_KEY, PERMIT2_VERIFIER_ADDRESS } = process.env;
    if (EXECUTOR_PRIVATE_KEY === undefined) {
      throw new Error("EXECUTOR_PRIVATE_KEY is not defined");
    }
    if (PERMIT2_VERIFIER_ADDRESS === undefined) {
      throw new Error("PERMIT2_VERIFIER_ADDRESS is not defined");
    }

    const contract = await createContractInstance(PERMIT2_VERIFIER_ADDRESS, provider);

    try {
      const proof: ProofData = readProof();
      const formattedProof: FormattedProofData = formatProof(proof);
      await submitProof(contract, formattedProof);
    } catch (error) {
      console.error("Main error:", error);
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
