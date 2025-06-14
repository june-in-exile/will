import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals, Digest } from 'multiformats/hashes/digest'
import * as fs from 'fs';
import chalk from 'chalk';

// Type definitions
interface Args {
    data?: any;
    path?: string;
}

/**
 * Compare two Uint8Arrays for equality
 * @param a - First Uint8Array to compare
 * @param b - Second Uint8Array to compare
 * @returns True if arrays are equal, false otherwise
 */
function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Parse command line arguments to extract JSON data or file path
 * Supports --json flag for JSON string and --path flag for file path
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
        if (args[i] === '--json' && i + 1 < args.length) {
            if (hasPath) {
                throw new Error('Cannot use both --json and --path options. Please specify only one.');
            }
            try {
                result.data = JSON.parse(args[i + 1]);
                console.log(chalk.blue('Using provided JSON data:'), result.data);
                hasJson = true;
            } catch (error) {
                console.error(chalk.red('Invalid JSON provided:'), args[i + 1]);
                throw error;
            }
        } else if (args[i] === '--path' && i + 1 < args.length) {
            if (hasJson) {
                throw new Error('Cannot use both --json and --path options. Please specify only one.');
            }
            result.path = args[i + 1];
            console.log(chalk.blue('Using file path:'), result.path);
            hasPath = true;
        }
    }

    // Check if neither option was provided
    if (!hasJson && !hasPath) {
        throw new Error('Must specify either --json with JSON string or --path with file path.');
    }

    return result;
}

/**
 * Read and parse JSON data from a file
 * @param path - Path to the JSON file to read
 * @returns Parsed JSON data from the file
 * @throws Error if file doesn't exist, can't be read, or contains invalid JSON
 */
function readJsonFromFile(path: string): unknown {
    try {
        // Check if file exists
        if (!fs.existsSync(path)) {
            throw new Error(`File does not exist: ${path}`);
        }

        // Check if it's a file (not a directory)
        const stats = fs.statSync(path);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${path}`);
        }

        // Read file content
        const fileContent = fs.readFileSync(path, 'utf8');
        console.log(chalk.green(`Successfully read file: ${path}`));

        // Parse JSON
        const json = JSON.parse(fileContent);
        console.log(chalk.blue('Parsed JSON data from file:'), json);

        return json;
    } catch (error) {
        if (error instanceof Error) {
            console.error(chalk.red(`Failed to read JSON from file: ${error.message}`));
        }
        throw error;
    }
}

/**
 * Get JSON data from either command line arguments or file path
 * @returns JSON data object (from CLI or file)
 * @throws Error if file operations fail or arguments are invalid
 */
function getjsonData(): any {
    const { data, path } = parseArgs();
    if (data) {
        return data;
    } else if (path) {
        return readJsonFromFile(path);
    } else {
        throw new Error('Nothing to be hashed');
    }
}

/**
 * Encode JSON data into Uint8Array using JSON codec
 * Compares manual encoding with multiformats json.encode() for validation
 * @param jsonData - JSON data to encode
 * @returns Encoded data as Uint8Array
 * @throws Error if encoding fails
 */
export function encode(jsonData: any): Uint8Array {
    try {
        const expectedBytes = json.encode(jsonData);

        const textEncoder = new TextEncoder();
        const jsonString = JSON.stringify(jsonData)
        const bytes = textEncoder.encode(jsonString);

        const isEqual = uint8ArraysEqual(expectedBytes, bytes);
        if (!isEqual) {
            console.warn(chalk.yellow('Warning: Manual encoding differs from json.encode()'));
            console.log('Expected bytes length:', expectedBytes.length);
            console.log('Manual bytes length:', bytes.length);
            return expectedBytes;
        }
        return bytes
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Failed to encode JSON data:'), errorMessage);
        throw error;
    }
}

/**
 * Generate SHA-256 multihash digest from encoded bytes
 * Performs validation by computing hash twice and comparing results
 * @param bytes - Encoded data as Uint8Array to hash
 * @returns Promise resolving to SHA-256 digest
 * @throws Error if hashing fails
 */
async function multihash(bytes: Uint8Array): Promise<Digest<18, number>> {
    try {
        const expectedDigest = await sha256.digest(bytes);
        const digest = await sha256.digest(bytes);

        if (!equals(expectedDigest, digest)) {
            console.warn(chalk.yellow('Warning: Manual hashing differs from sha256.digest()'));
            console.log('Expected hash digest:', expectedDigest);
            console.log('Manual hash digest:', digest);
            return expectedDigest;
        }

        console.log(chalk.green('Hash digest calculated successfully'));
        return digest;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Failed to calculate hash digest:'), errorMessage);
        throw error;
    }
}

/**
 * Create a Content Identifier (CID) from a hash digest
 * Uses CIDv1 with JSON codec and the provided hash digest
 * Performs validation by creating CID twice and comparing results
 * @param digest - SHA-256 digest to create CID from
 * @returns CID object with version 1, JSON codec, and provided digest
 * @throws Error if CID creation fails
 */
function createCid(digest: Digest<18, number>): CID<unknown, 512, number, 1> {
    try {
        const expectedCid = CID.create(1, json.code, digest);
        const cid = CID.create(1, json.code, digest);

        if (!expectedCid.equals(cid)) {
            console.warn(chalk.yellow('Warning: Manual creation differs from CID.create()'));
            console.log('Expected cid:', expectedCid);
            console.log('Manual cid:', cid);
            return expectedCid;
        }

        console.log(chalk.green('CID calculated successfully'));
        return cid;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Failed to calculate CID:'), errorMessage);
        throw error;
    }
}

/**
 * Convert CID object to string representation
 * Performs validation by converting twice and comparing results
 * @param cid - CID object to convert to string
 * @returns String representation of the CID
 * @throws Error if conversion fails
 */
function toString(cid: CID<unknown, 512, number, 1>): String {
    try {
        const expectedCidString = cid.toString();
        const cidString = cid.toString();
        if (cidString !== expectedCidString) {
            console.warn(chalk.yellow('Warning: Manual conversion differs from cid.toString()'));
            console.log('Expected CID string:', expectedCidString);
            console.log('Manual CID string:', cidString);
            return expectedCidString;
        }
        console.log(chalk.green('CID string converted successfully'));
        return cidString;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Failed to convert CID to string:'), errorMessage);
        throw error;
    }
}

/**
 * Display usage information for the script
 */
function showUsage(): void {
    console.log(chalk.cyan('\n=== Usage Information ==='));
    console.log(chalk.white('This script generates IPFS CID from JSON data using one of three methods:\n'));

    console.log(chalk.yellow('1. Using JSON data directly:'));
    console.log(chalk.gray('   pnpm exec tsx hash.ts --json \'{"id":1,"name":"test"}\''));

    console.log(chalk.yellow('\n2. Using JSON file:'));
    console.log(chalk.gray('   pnpm exec tsx hash.ts --path ./data.json'));

    console.log(chalk.red('\nImportant:'));
    console.log(chalk.red('• You must specify either --json OR --path (not both)'));
    console.log(chalk.red('• You cannot run the script without any arguments'));
}

/**
 * Convert Uint8Array to hex string representation
 * @param bytes - Uint8Array to convert
 * @returns Hex string representation (0x prefixed)
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
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
        console.log(chalk.cyan('=== Hashing JSON into CID ===\n'));

        const jsonData = getjsonData();
        const bytes = encode(jsonData);
        const digest = await multihash(bytes);
        const cid = createCid(digest);
        const cidString = toString(cid);

        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
        console.log(chalk.gray('Results:'), {
            cid: cidString,
            json: jsonData,
            contentBytes: uint8ArrayToHex(bytes),
            contentMultiHash: uint8ArrayToHex(digest.bytes),
            cidBytes: uint8ArrayToHex(cid.bytes)
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red.bold('\n❌ Program execution failed:'), errorMessage);

        // Show usage information for argument-related errors
        if (errorMessage.includes('--json') || errorMessage.includes('--path') ||
            errorMessage.includes('Must specify')) {
            showUsage();
        }

        // Log stack trace in development mode
        if (process.env.NODE_ENV === 'development' && error instanceof Error) {
            console.error(chalk.gray('Stack trace:'), error.stack);
        }

        process.exit(1);
    }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    // Only run when executed directly
    main().catch((error: Error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red.bold('Uncaught error:'), errorMessage);
        process.exit(1);
    });
}