import type { Groth16Proof } from "@shared/types/index.js";
import { generateZkpProof } from "./generator.js";
import chalk from "chalk";

async function generateMultiplier2Proof(): Promise<Groth16Proof> {
  return generateZkpProof({
    circuitName: "multiplier2",
    input: {
      a: Math.floor(Math.random() * 100),
      b: Math.floor(Math.random() * 100)
    },
  });
}

async function main(): Promise<void> {
  console.log(chalk.cyan(`\n=== Generating Multiplier2 Zero Knowledge Proof ===\n`));

  await generateMultiplier2Proof();

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

export { generateMultiplier2Proof };