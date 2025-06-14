import { readTestamentData, EncryptedTestamentData } from '../../../apps/backend/src/IPFS/upload'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals, Digest } from 'multiformats/hashes/digest'
import chalk from 'chalk';

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
 * Parse command line arguments to extract JSON data
 * Looks for --json flag followed by JSON string
 * @returns Object containing parsed jsonData if --json flag is provided
 * @throws Error if JSON parsing fails
 */
function parseCommandLineArgs(): { jsonData?: unknown } {
    const args = process.argv.slice(2);
    const result: { jsonData?: unknown } = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--data' && i + 1 < args.length) {
            try {
                result.jsonData = JSON.parse(args[i + 1]);
                console.log(chalk.blue('Using provided JSON data:'), result.jsonData);
            } catch (error) {
                console.error(chalk.red('Invalid JSON provided:'), args[i + 1]);
                throw error;
            }
            break;
        }
    }
    
    return result;
}

/**
 * Get testament data from either command line arguments or default source
 * Prioritizes command line JSON data over default testament data
 * @returns Testament data object (either from CLI or default source)
 */
function getJsonData(): EncryptedTestamentData | any {
    const { jsonData } = parseCommandLineArgs();
    
    if (jsonData) {
        console.log(chalk.blue('Using command line JSON data'));
        return jsonData;
    } else {
        console.log(chalk.blue('Using default testament data'));
        return readTestamentData();
    }
}
  
/**
 * Encode testament data into Uint8Array using JSON codec
 * Compares manual encoding with multiformats json.encode() for validation
 * @param testamentJson - Testament data to encode (EncryptedTestamentData or any JSON object)
 * @returns Encoded data as Uint8Array
 * @throws Error if encoding fails
 */
function encode(testamentJson: EncryptedTestamentData | any): Uint8Array { 
    try {
        const expectedBytes = json.encode(testamentJson);
        
        const textEncoder = new TextEncoder();
        const testamentString = JSON.stringify(testamentJson)
        const bytes = textEncoder.encode(testamentString);
        
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
        console.error(chalk.red('Failed to encode testament data:'), errorMessage);
        throw error;
    }
}

/**
 * Generate SHA-256 hash digest from encoded bytes
 * Performs validation by computing hash twice and comparing results
 * @param bytes - Encoded data as Uint8Array to hash
 * @returns Promise resolving to SHA-256 digest
 * @throws Error if hashing fails
 */
async function hash(bytes: Uint8Array): Promise<Digest<18, number>> { 
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
 * Main function that orchestrates the entire IPFS hashing process
 * 1. Gets testament data (from CLI args or default source)
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
        console.log(chalk.cyan('=== IPFS Testament Hashing into CID ===\n'));

        const jsonData = getJsonData();
        const bytes = encode(jsonData);
        const digest = await hash(bytes);
        const cid = createCid(digest);
        const cidString = toString(cid);

        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
        console.log(chalk.gray('Results:'), {
            cid: cidString,
            data: jsonData
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red.bold('\n❌ Program execution failed:'), errorMessage);

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