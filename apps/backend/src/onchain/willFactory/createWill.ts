import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { validateFiles } from "@shared/utils/validation/file.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import { JsonRpcProvider } from "ethers";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { createWallet, createContract } from "@shared/utils/blockchain.js";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
import type { ProofData } from "@shared/types/crypto.js";
import { readProof } from "@shared/utils/file/readProof.js";
import { readWill, readWillFields } from "@shared/utils/file/readWill.js";
import { encryptedWillToTypedJsonObject } from "@shared/utils/transform/blockchain.js";
import { printEstates, printProof } from "@shared/utils/print.js";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { WILL_TYPE } from "@shared/constants/willType.js";
import type { EncryptedWill } from "@shared/types/will.js";
import type { Estate } from "@shared/types/blockchain.js";
import type { CreateWill } from "@shared/types/environment.js";
import chalk from "chalk";

interface CreateWillData {
  proof: ProofData;
  will: JsonCidVerifier.TypedJsonObjectStruct;
  cid: string;
  testator: string;
  estates: Estate[];
  salt: bigint;
}

interface ProcessResult {
  transactionHash: string;
  timestamp: number;
  gasUsed: bigint;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): CreateWill {
  const result = validateEnvironment<CreateWill>(
    presetValidations.createWill(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Print detailed CreateWillData information
 */
function printCreateWillData(createData: CreateWillData): void {
  console.log(chalk.cyan("\n=== CreateWillData Details ==="));

  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(createData.cid));

  console.log(chalk.blue("\n👤 Testator Information:"));
  console.log(chalk.gray("- Testator:"), chalk.white(createData.testator));

  console.log(chalk.blue("\n🧂 Salt Information:"));
  console.log(chalk.gray("- Salt:"), chalk.white(createData.salt.toString()));

  printEstates(createData.estates);

  printProof(createData.proof);

  console.log(chalk.cyan("\n=== End of CreateWillData Details ===\n"));
}

/**
 * Execute createWill transaction
 */
async function executeCreateWill(
  contract: WillFactory,
  createData: CreateWillData,
): Promise<ProcessResult> {
  try {
    console.log(chalk.blue("Executing createWill transaction..."));

    printCreateWillData(createData);

    const contractEstates = createData.estates.map((estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    const tx = await contract.createWill(
      createData.proof.pA,
      createData.proof.pB,
      createData.proof.pC,
      createData.proof.pubSignals,
      createData.will,
      createData.cid,
      createData.testator,
      contractEstates,
      createData.salt,
    );

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    if (receipt.status !== 1) {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    console.log(chalk.green("✅ Transaction confirmed:"), receipt.hash);
    console.log(chalk.gray("Block number:"), receipt.blockNumber);
    console.log(chalk.gray("Gas used:"), receipt.gasUsed.toString());

    return {
      transactionHash: receipt.hash,
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    throw new Error(
      `Failed to execute createWill: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process will creation workflow
 */
async function processCreateWill(): Promise<ProcessResult> {
  try {
    validateFiles([
      PATHS_CONFIG.zkp.multiplier2.proof,
      PATHS_CONFIG.zkp.multiplier2.public,
    ]);
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID } =
      validateEnvironmentVariables();

    const fields = readWillFields(WILL_TYPE.DECRYPTED, [
      "testator",
      "estates",
      "salt",
    ]);

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    const contract = await createContract<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      wallet,
    );

    const proof: ProofData = readProof();
    const encryptedWill: EncryptedWill = readWill(WILL_TYPE.ENCRYPTED);
    const encryptedWillKeyValues: JsonCidVerifier.TypedJsonObjectStruct =
      encryptedWillToTypedJsonObject(encryptedWill);

    const result = await executeCreateWill(contract, {
      proof,
      will: encryptedWillKeyValues,
      cid: CID,
      testator: fields.testator,
      estates: fields.estates,
      salt: BigInt(fields.salt),
    });

    await updateEnvironmentVariables([
      ["CREATE_WILL_TX_HASH", result.transactionHash],
      ["CREATE_WILL_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 Will creation process completed successfully!"),
    );

    return result;
  } catch (error) {
    console.error(
      chalk.red("Error during will creation process:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Create Will ===\n"));

    const result = await processCreateWill();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), result);
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

export { executeCreateWill, processCreateWill };
