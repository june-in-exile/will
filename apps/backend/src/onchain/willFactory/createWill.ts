import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
import { WillFileType, EncryptedWillData } from "@shared/types/will.js";
import { ProofData } from "@shared/types/crypto.js";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import { encryptedWillToTypedJsonObject } from "@shared/utils/transform/blockchain.js"
import { readWill } from "@shared/utils/file/readWill.js"
import { readProof } from "@shared/utils/file/readProof.js";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import type { CreateWill } from "@shared/types/environment.js";
import type { Estate } from "@shared/types/blockchain.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { createWallet, createContractInstance } from "@shared/utils/crypto/blockchain.js"
import { validateEthereumAddress } from "@shared/utils/validation/blockchain.js";
import { JsonRpcProvider } from "ethers";
import { validateFiles } from "@shared/utils/validation/file.js"
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

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
  willAddress: string;
  cid: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): CreateWill {
  const result = validateEnvironment<CreateWill>(presetValidations.createWill());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
}

/**
 * Parse estates from environment variables
 */
function parseEstatesFromEnvironment(): Estate[] {
  const estates: Estate[] = [];
  let index = 0;

  while (true) {
    const beneficiary = process.env[`BENEFICIARY${index}`];
    const token = process.env[`TOKEN${index}`];
    const amount = process.env[`AMOUNT${index}`];

    if (!beneficiary || !token || !amount) {
      break;
    }

    // Validate addresses
    if (!validateEthereumAddress(beneficiary)) {
      throw new Error(
        `Invalid beneficiary address at index ${index}: ${beneficiary}`,
      );
    }

    if (!validateEthereumAddress(token)) {
      throw new Error(`Invalid token address at index ${index}: ${token}`);
    }

    // Validate amount
    let parsedAmount: bigint;
    try {
      parsedAmount = BigInt(amount);
    } catch {
      throw new Error(`Invalid amount at index ${index}: ${amount}`);
    }

    if (parsedAmount <= 0n) {
      throw new Error(
        `Amount must be greater than zero at index ${index}: ${amount}`,
      );
    }

    estates.push({
      beneficiary,
      token,
      amount: parsedAmount,
    });

    index++;
  }

  if (estates.length === 0) {
    throw new Error(
      "No estates found in environment variables. Please set BENEFICIARY0, TOKEN0, AMOUNT0, etc.",
    );
  }

  console.log(
    chalk.green(`✅ Found ${estates.length} estate(s) in environment`),
  );
  return estates;
}


/**
 * Print detailed CreateWillData information
 */
function printCreateWillData(createData: CreateWillData): void {
  console.log(chalk.cyan("\n=== CreateWillData Details ==="));

  // Print CID
  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(createData.cid));

  // Print Testator
  console.log(chalk.blue("\n👤 Testator Information:"));
  console.log(chalk.gray("- Testator:"), chalk.white(createData.testator));

  // Print Salt
  console.log(chalk.blue("\n🧂 Salt Information:"));
  console.log(chalk.gray("- Salt:"), chalk.white(createData.salt.toString()));

  // Print Estates
  console.log(chalk.blue("\n🏛️  Estate Information:"));
  createData.estates.forEach((estate, index) => {
    console.log(chalk.gray(`  Estate ${index}:`));
    console.log(
      chalk.gray("    - Beneficiary:"),
      chalk.white(estate.beneficiary),
    );
    console.log(chalk.gray("    - Token:"), chalk.white(estate.token));
    console.log(
      chalk.gray("    - Amount:"),
      chalk.white(estate.amount.toString()),
    );
  });

  // Print Proof Data
  console.log(chalk.blue("\n🔐 Proof Data:"));
  console.log(
    chalk.gray("- pA[0]:"),
    chalk.white(createData.proof.pA[0].toString()),
  );
  console.log(
    chalk.gray("- pA[1]:"),
    chalk.white(createData.proof.pA[1].toString()),
  );
  console.log(
    chalk.gray("- pB[0][0]:"),
    chalk.white(createData.proof.pB[0][0].toString()),
  );
  console.log(
    chalk.gray("- pB[0][1]:"),
    chalk.white(createData.proof.pB[0][1].toString()),
  );
  console.log(
    chalk.gray("- pB[1][0]:"),
    chalk.white(createData.proof.pB[1][0].toString()),
  );
  console.log(
    chalk.gray("- pB[1][1]:"),
    chalk.white(createData.proof.pB[1][1].toString()),
  );
  console.log(
    chalk.gray("- pC[0]:"),
    chalk.white(createData.proof.pC[0].toString()),
  );
  console.log(
    chalk.gray("- pC[1]:"),
    chalk.white(createData.proof.pC[1].toString()),
  );
  console.log(
    chalk.gray("- pubSignals[0]:"),
    chalk.white(createData.proof.pubSignals[0].toString()),
  );

  // Print Will Data
  console.log(chalk.blue("\n📝 Encrypted Will Keys & Values:"));
  createData.will.keys.forEach((key: string, index: string) => {
    const jsonValue: JsonCidVerifier.JsonValue = createData.will.values[index];
    let valueType: string;
    switch (jsonValue.valueType) {
      case 0:
        valueType = "STRING";
        break;
      case 1:
        valueType = "NUMBER";
        break;
      case 2:
        valueType = "BOOLEAN";
        break;
      case 3:
        valueType = "NULL";
        break;
      default:
        throw new Error("Invalid JsonValueType");
    }
    console.log(
      chalk.gray(`  [${index}]`),
      chalk.cyan(key),
      chalk.gray("=>"),
      chalk.white(`{value: ${jsonValue.value}, valueType: ${valueType}}`),
    );
  });

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

    // Print detailed create will data information
    printCreateWillData(createData);

    // Convert estates to the format expected by the contract
    const contractEstates = createData.estates.map((estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    // Estimate gas
    const gasEstimate = await contract.createWill.estimateGas(
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

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
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
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      },
    );

    console.log(chalk.yellow("Transaction sent:"), tx.hash);
    console.log(chalk.blue("Waiting for confirmation..."));

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

    // Find the WillCreated event to get the actual will address
    const willCreatedEvent = receipt.logs.find((log: string) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "WillCreated";
      } catch {
        return false;
      }
    });

    let willAddress;
    if (willCreatedEvent) {
      const parsed = contract.interface.parseLog(willCreatedEvent);
      if (parsed) {
        willAddress = parsed.args.will;
        console.log(chalk.green("✅ Will created at:"), willAddress);
      }
    }

    return {
      transactionHash: receipt.hash,
      willAddress,
      cid: createData.cid,
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to execute createWill: ${errorMessage}`);
  }
}

/**
 * Process will creation workflow
 */
async function processCreateWill(): Promise<ProcessResult> {
  try {
    // Validate prerequisites
    validateFiles([
      PATHS_CONFIG.zkp.multiplier2.proof,
      PATHS_CONFIG.zkp.multiplier2.public,
    ]);
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID, TESTATOR, SALT } =
      validateEnvironmentVariables();

    // Parse estates from environment
    const estates = parseEstatesFromEnvironment();

    // Parse salt
    let saltBigInt: bigint;
    try {
      saltBigInt = BigInt(SALT);
    } catch {
      throw new Error(`Invalid salt format: ${SALT}`);
    }

    // Initialize provider and validate connection
    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      wallet,
    );

    // Read required data
    const proof: ProofData = readProof();
    const willData: EncryptedWillData = readWill(WillFileType.ENCRYPTED);
    const will: JsonCidVerifier.TypedJsonObjectStruct =
      encryptedWillToTypedJsonObject(willData);

    // Execute will creation
    const result = await executeCreateWill(contract, {
      proof,
      will,
      cid: CID,
      testator: TESTATOR,
      estates,
      salt: saltBigInt,
    });

    // Update environment
    await updateEnvironmentVariables([
      ["CREATE_WILL_TX_HASH", result.transactionHash],
      ["WILL", result.willAddress],
      ["CREATE_WILL_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 Will creation process completed successfully!"),
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will creation process:"),
      errorMessage,
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const result = await processCreateWill();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- Will Address:"), result.willAddress);
    console.log(chalk.gray("- CID:"), result.cid);
    console.log(chalk.gray("- Gas Used:"), result.gasUsed.toString());
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

export {
  validateEnvironmentVariables,
  parseEstatesFromEnvironment,
  printCreateWillData,
  executeCreateWill,
  processCreateWill
}
