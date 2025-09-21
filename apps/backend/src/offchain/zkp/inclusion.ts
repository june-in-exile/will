import { PATHS_CONFIG } from "@config";
import type { Groth16Proof, CreateWillInput } from "@shared/types/zkp.js";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";

const execAsync = promisify(exec);

async function generateInclusionProof(input: CreateWillInput): Promise<Groth16Proof> {
  const { ciphertext, key, iv, expectedTestator, expectedEstates } = input;

  console.log(chalk.blue(`Generating inclusion proof for will creation`));

  const circuitName = "willCreation";
  const zkpBaseDir = "../../zkp";
  const circuitDir = `${zkpBaseDir}/circuits/${circuitName}`;
  const buildDir = `${circuitDir}/build`;
  const inputsDir = `${circuitDir}/inputs`;
  const keysDir = `${circuitDir}/keys`;

  const wasmFile = `${buildDir}/${circuitName}_js/${circuitName}.wasm`;
  const zkeyFile = `${keysDir}/${circuitName}_0001.zkey`;
  const inputFile = `${inputsDir}/input.json`;
  const witnessFile = `${buildDir}/witness.wtns`;
  const proofFile = PATHS_CONFIG.zkp.createWill.proof;
  const publicFile = PATHS_CONFIG.zkp.createWill.public;

  try {
    await mkdir(dirname(proofFile), { recursive: true });
    await mkdir(dirname(publicFile), { recursive: true });
    await mkdir(dirname(inputFile), { recursive: true });
    await mkdir(dirname(witnessFile), { recursive: true });

    await writeFile(inputFile, JSON.stringify({
      ciphertext,
      key,
      iv,
      expectedTestator: expectedTestator.toString(),
      expectedEstates: expectedEstates.map(e => e.toString())
    }, null, 2));
    console.log(chalk.green(`✅ Input file created: ${inputFile}`));

    console.log(chalk.blue("Calculating witness..."));
    await execAsync(`snarkjs wtns calculate ${wasmFile} ${inputFile} ${witnessFile}`);
    console.log(chalk.green("✅ Witness calculated"));

    console.log(chalk.blue("Generating proof..."));
    await execAsync(`snarkjs groth16 prove ${zkeyFile} ${witnessFile} ${proofFile} ${publicFile}`);
    console.log(chalk.green("✅ Proof generated"));

    const proofContent = await import(proofFile, { assert: { type: "json" } });
    const publicContent = await import(publicFile, { assert: { type: "json" } });

    console.log(chalk.cyan(`📁 Proof file: ${proofFile}`));
    console.log(chalk.cyan(`📁 Public signals file: ${publicFile}`));

    return {
      proof: proofContent.default,
      publicSignals: publicContent.default
    };
  } catch (error) {
    throw new Error(
      `Failed to generate inclusion proof: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== Generating Will Creation Inclusion Proof ===\n")
    );

    const input: CreateWillInput = {
      ciphertext: [
        131, 12, 245, 205, 129, 145, 210, 196, 196, 238, 134, 210, 253, 81, 15, 237,
        230, 130, 138, 245, 196, 30, 210, 98, 40, 81, 147, 205, 108, 204, 69, 63,
        160, 60, 175, 176, 138, 29, 183, 229, 33, 196, 131, 187, 130, 227, 205, 97,
        36, 101, 62, 135, 0, 120, 144, 63, 157, 167, 145, 39, 27, 68, 40, 36, 65,
        18, 72, 5, 143, 33, 122, 188, 10, 93, 112, 152, 161, 139, 96, 123, 245, 168,
        97, 158, 139, 24, 218, 13, 148, 92, 175, 75, 250, 66, 138, 162, 178, 177,
        35, 212, 2, 248, 138, 211, 249, 44, 123, 34, 143, 239, 68, 5, 131, 200, 92,
        139, 162, 155, 88, 161, 43, 52, 14, 129, 148, 104, 183, 159, 70, 225, 133,
        252, 123, 4, 60, 82, 147, 40, 226, 17, 127, 238, 32, 224, 56, 122, 139, 137,
        131, 35, 53, 134, 190, 26, 26, 35, 101, 242, 108, 129, 187, 60, 153, 96, 40,
        229, 141, 144, 158, 46, 105, 199, 9, 104, 151, 75, 21, 220, 136, 253, 144,
        54, 132, 204, 46, 84, 41, 52, 73, 25, 33, 61, 151, 114, 33, 55, 3, 45, 149,
        223, 10, 121, 180, 226, 247, 221, 36, 252, 27, 105, 140, 14, 145, 45, 10,
        103, 243, 91, 58, 141, 156, 18, 228, 3, 96, 44, 225, 251, 204, 151, 201, 58,
        241, 127, 239, 186, 34, 9, 164, 252, 159, 96, 13, 121, 115, 60, 87, 233, 76,
        128, 184, 76, 204, 169, 118, 63, 207, 231, 139, 34, 178, 127, 162, 39, 68,
        10, 220, 190, 90
      ],
      key: [
        133, 145, 81, 141, 134, 254, 37, 98, 203, 8, 0, 35, 211, 215, 154, 86, 127,
        208, 101, 128, 25, 239, 93, 206, 6, 231, 69, 177, 32, 14, 15, 52
      ],
      iv: [
        225, 33, 187, 199, 111, 28, 77, 46, 234, 100, 34, 59, 114, 39, 189, 178
      ],
      expectedTestator: BigInt("23534931745907890980266428008810490351955727564"),
      expectedEstates: [
        BigInt("365062515231589969257526822856879792433486645900"),
        BigInt("673548107664921955330296301951937659338232343117"),
        BigInt("1000"),
        BigInt("365062515231589969257526822856879792433486645900"),
        BigInt("1015226402129197188552501637625932070384463636494"),
        BigInt("5000000")
      ]
    };

    await generateInclusionProof(input);

    console.log(chalk.green("\n✅ Successfully generated inclusion proof."));
  } catch (error) {
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error"
    );
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
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
