import { PATHS_CONFIG } from "@config";
import { ProofData } from "@type/crypto.js";
import { readFileSync } from "fs";
import chalk from "chalk";

/**
 * Read proof data from file
 */
export function readProof(): ProofData {
  try {
    console.log(chalk.blue("Reading testator proof data..."));

    const proof = JSON.parse(
      readFileSync(PATHS_CONFIG.zkp.multiplier2.proof, "utf8"),
    );
    const publicSignals = JSON.parse(
      readFileSync(PATHS_CONFIG.zkp.multiplier2.public, "utf8"),
    );

    const proofData: ProofData = {
      pA: [proof.pi_a[0], proof.pi_a[1]],
      pB: [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // Note：G2 point needs to swap the order
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      pC: [proof.pi_c[0], proof.pi_c[1]],
      pubSignals: publicSignals,
    };

    console.log(chalk.green("✅ Proof data loaded successfully"));
    return proofData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in proof file: ${error.message}`);
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read proof data: ${errorMessage}`);
  }
}
