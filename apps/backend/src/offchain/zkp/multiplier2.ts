import type { Groth16Proof, Multiplier2Input } from "@shared/types/index.js";
import { generateZkpProof, runZkpMain } from "./generator.js";
import chalk from "chalk";

async function generateMultiplier2Proof(input: Multiplier2Input): Promise<Groth16Proof> {
  const { a, b } = input;
  console.log(chalk.blue(`Input: a=${a}, b=${b}, expected c=${a * b}`));

  return generateZkpProof({
    circuitName: "multiplier2",
    input,
  });
}

async function main(): Promise<void> {
  await runZkpMain("Generating Multiplier2 Zero Knowledge Proof", async () => {
    const input: Multiplier2Input = {
      a: Math.floor(Math.random() * 100),
      b: Math.floor(Math.random() * 100)
    };

    await generateMultiplier2Proof(input);
  });
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