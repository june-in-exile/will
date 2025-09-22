import type { Groth16Proof, SignedWill, EncryptedWill } from "@shared/types/index.js";
import { generateZkpProof } from "./generator.js";
import { WILL_TYPE } from "@shared/constants/index.js";
import { readWill, getKey, base64ToBytes, flattenEstates } from "@shared/utils/index.js";
import chalk from "chalk";

async function generateInclusionProof(): Promise<Groth16Proof> {
  const signedWill: SignedWill = readWill(WILL_TYPE.SIGNED);
  const encryptedWill: EncryptedWill = readWill(WILL_TYPE.ENCRYPTED);
  const key = getKey();

  return generateZkpProof({
    circuitName: "willCreation",
    input: {
      ciphertext: base64ToBytes(encryptedWill.ciphertext),
      key: base64ToBytes(key.toString("base64")),
      iv: base64ToBytes(encryptedWill.iv),
      expectedTestator: BigInt(signedWill.testator).toString(),
      expectedEstates: flattenEstates(signedWill.estates),
    }
  });
}

async function main(): Promise<void> {
  console.log(chalk.cyan(`\n=== Generating Will Creation Inclusion Proof ===\n`));

  await generateInclusionProof();

  console.log(chalk.green.bold("\n✅ Process completed successfully!"));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error: Error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  });
}

export { generateInclusionProof };
