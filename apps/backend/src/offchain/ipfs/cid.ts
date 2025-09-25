import { uint8ArrayToHex } from "@shared/utils/transform/encoding.js";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as json from "multiformats/codecs/json";
import * as fs from "fs";
import chalk from "chalk";

// Type definitions
interface Args {
  data?: unknown;
  path?: string;
}

/**
 * Parse command line arguments to extract JSON data or file path
 * Supports --data flag for JSON string and --path flag for file path
 * Validates that only one option is provided
 * @returns Object containing either json or path
 * @throws Error if JSON parsing fails, file operations fail, or invalid argument combinations
 */
function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {};
  let hasJson = false;
  let hasPath = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data" && i + 1 < args.length) {
      if (hasPath) {
        throw new Error(
          "Cannot use both --data and --path options. Please specify only one.",
        );
      }
      try {
        result.data = JSON.parse(args[i + 1]);
        console.log(chalk.blue("Using provided JSON data:"), result.data);
        hasJson = true;
      } catch (error) {
        console.error(chalk.red("Invalid JSON provided:"), args[i + 1]);
        throw error;
      }
    } else if (args[i] === "--path" && i + 1 < args.length) {
      if (hasJson) {
        throw new Error(
          "Cannot use both --data and --path options. Please specify only one.",
        );
      }
      result.path = args[i + 1];
      console.log(chalk.blue("Using file path:"), result.path);
      hasPath = true;
    }
  }

  // Check if neither option was provided
  if (!hasJson && !hasPath) {
    throw new Error(
      "Must specify either --data with JSON string or --path with file path.",
    );
  }

  return result;
}

/**
 * Get JSON data from either command line arguments or file path
 * @returns JSON data object (from CLI or file)
 * @throws Error if file operations fail or arguments are invalid
 */
function getJsonData() {
  const { data, path } = parseArgs();
  if (data) {
    return data;
  } else if (path) {
    const fileContent = fs.readFileSync(path, "utf8");
    return JSON.parse(fileContent);
  } else {
    throw new Error("Nothing to be hashed");
  }
}

/**
 * Display usage information for the script
 */
function showUsage(): void {
  console.log(chalk.cyan("\n=== Usage Information ===\n"));
  console.log(
    chalk.white(
      "This script generates IPFS CID from JSON data using one of three methods:\n",
    ),
  );

  console.log(chalk.yellow("1. Using JSON data directly:"));
  console.log(
    chalk.gray('   pnpm exec tsx cid.ts --data \'{"id":1,"name":"test"}\''),
  );

  console.log(chalk.yellow("\n2. Using JSON file:"));
  console.log(chalk.gray("   pnpm exec tsx cid.ts --path ./data.json"));

  console.log(chalk.red("\nImportant:"));
  console.log(
    chalk.red("• You must specify either --data OR --path (not both)"),
  );
  console.log(chalk.red("• You cannot run the script without any arguments"));
}

/**
 * Main function that orchestrates the entire IPFS hashing process
 * 1. Gets JSON data (from CLI args or file)
 * 2. Encodes the data to bytes
 * 3. Generates SHA-256 hash digest
 * 4. Creates CID from the digest
 * 5. Converts CID to string representation
 *
 * @returns Promise that resolves when process completes successfully
 * @throws Error if any step in the process fails
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Hashing JSON into CID ===\n"));

    const jsonData = getJsonData();
    const bytes = json.encode(jsonData);
    const digest = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, digest);

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      json: jsonData,
      jsonBytes: uint8ArrayToHex(bytes),
      multihash: uint8ArrayToHex(digest.bytes),
      cidBytes: uint8ArrayToHex(cid.bytes),
      cid: cid.toString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      errorMessage,
    );

    // Show usage information for argument-related errors
    if (
      errorMessage.includes("--data") ||
      errorMessage.includes("--path") ||
      errorMessage.includes("Must specify")
    ) {
      showUsage();
    }

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
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}
