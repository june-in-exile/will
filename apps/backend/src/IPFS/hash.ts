import { readTestamentData, EncryptedTestamentData } from './upload'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals, Digest } from 'multiformats/hashes/digest'
import chalk from 'chalk';

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
}
  
function encode(testamentJson: EncryptedTestamentData): Uint8Array { 
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
 * Main function
 */
async function main(): Promise<void> {
    try {
        console.log(chalk.cyan('=== IPFS Testament Hashing into CID ===\n'));

        const testamentJson = readTestamentData();
        
        const bytes = encode(testamentJson);
        const digest = await hash(bytes);
        const cid = createCid(digest);
        const cidString = toString(cid);

        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
        console.log(chalk.gray('Results:'), {
            cid: cidString
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