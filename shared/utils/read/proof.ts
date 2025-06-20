import { PATHS_CONFIG } from "../../config.js";
import { ProofData } from "../../types";
import { toBase32 } from "../../utils/format/base32.js";
import { readFileSync } from "fs";
import chalk from "chalk";

/**
 * Read proof data from file
 */
export function readProof(): ProofData {
  try {
    console.log(chalk.blue("Reading testator proof data..."));

    const proof = JSON.parse(readFileSync(PATHS_CONFIG.circuits.proof, "utf8"));
    const publicSignals = JSON.parse(
      readFileSync(PATHS_CONFIG.circuits.public, "utf8"),
    );

    const proofData: ProofData = {
      pA: [
        toBase32(proof.pi_a[0]),
        toBase32(proof.pi_a[1])
      ],
      pB: [
        [
          toBase32(proof.pi_b[0][1]),
          toBase32(proof.pi_b[0][0])
        ], // Note：G2 point needs to swap the order
        [
          toBase32(proof.pi_b[1][1]),
          toBase32(proof.pi_b[1][0])
        ],
      ],
      pC: [
        toBase32(proof.pi_c[0]),
        toBase32(proof.pi_c[1])
      ],
      pubSignals: [toBase32(publicSignals)],
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
