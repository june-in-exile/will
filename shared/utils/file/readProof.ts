import { PATHS_CONFIG } from "@config";
import { ProofData } from "@shared/types/crypto.js";
import { readFileSync } from "fs";
import chalk from "chalk";

/**
 * Read proof data from file
 */
export function readProof(circuitName: keyof typeof PATHS_CONFIG.zkp = "multiplier2"): ProofData {
  try {
    console.log(chalk.blue("Reading testator proof data..."));

    const files = PATHS_CONFIG.zkp[circuitName];

    const proof = JSON.parse(
      readFileSync(files.proof, "utf8"),
    );
    const publicSignals = JSON.parse(
      readFileSync(files.public, "utf8"),
    );

    const proofData: ProofData = {
      pA: [proof.pi_a[0], proof.pi_a[1]],
      pB: [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // @note G2 point needs to swap the order
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
    throw new Error(
      `Failed to read proof data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
