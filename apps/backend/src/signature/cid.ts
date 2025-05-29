import { PATHS_CONFIG, SIGNATURE_CONFIG } from '@shared/config.js';
import { signString, verify } from '@shared/utils/crypto/signature.js';
import { updateEnvVariable } from '@shared/utils/env/updateEnvVariable.js';
import { config } from 'dotenv';
import assert from 'assert';
import chalk from 'chalk';

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
    CID: string;
    EXECUTOR_PRIVATE_KEY: string;
    EXECUTOR: string;
}

interface ProcessResult {
    cid: string;
    signature: string;
    executor: string;
    signatureLength: number;
    success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
    const { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR } = process.env;

    if (!CID) {
        throw new Error('Environment variable CID is not set');
    }

    if (!EXECUTOR_PRIVATE_KEY) {
        throw new Error('Environment variable EXECUTOR_PRIVATE_KEY is not set');
    }

    if (!EXECUTOR) {
        throw new Error('Environment variable EXECUTOR is not set');
    }

    return { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR };
}

/**
 * Validate CID format
 */
function validateCid(cid: string): boolean {
    try {
        // Basic CID validation
        if (typeof cid !== 'string') {
            throw new Error('CID must be a string');
        }

        if (cid.length < SIGNATURE_CONFIG.cid.minLength || cid.length > SIGNATURE_CONFIG.cid.maxLength) {
            throw new Error(`CID length must be between ${SIGNATURE_CONFIG.cid.minLength} and ${SIGNATURE_CONFIG.cid.maxLength} characters`);
        }

        // Check if CID starts with expected prefixes (Qm for v0, b for v1 base32, etc.)
        const validPrefixes = ['Qm', 'b', 'z', 'f', 'u'];
        const hasValidPrefix = validPrefixes.some(prefix => cid.startsWith(prefix));

        if (!hasValidPrefix) {
            console.warn(chalk.yellow('⚠️ CID does not start with common IPFS prefixes'));
        }

        console.log(chalk.green('✅ CID format validated'));
        console.log(chalk.gray('CID:'), chalk.white(cid));
        console.log(chalk.gray('Length:'), cid.length);

        return true;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid CID format: ${errorMessage}`);
    }
}

/**
 * Validate private key format
 */
function validatePrivateKey(privateKey: string): string {
    try {
        // Remove 0x prefix if present
        const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

        if (cleanKey.length !== SIGNATURE_CONFIG.privateKeyLength) {
            throw new Error(`Private key must be ${SIGNATURE_CONFIG.privateKeyLength} characters (32 bytes) in hex format`);
        }

        // Check if it's valid hex
        if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
            throw new Error('Private key must be in hexadecimal format');
        }

        console.log(chalk.green('✅ Private key format validated'));

        return cleanKey;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid private key format: ${errorMessage}`);
    }
}

/**
 * Validate executor address format
 */
function validateExecutorAddress(address: string): boolean {
    try {
        // Basic Ethereum address validation
        if (typeof address !== 'string') {
            throw new Error('Executor address must be a string');
        }

        // Check if it looks like an Ethereum address
        const addressRegex = /^0x[0-9a-fA-F]{40}$/;
        if (!addressRegex.test(address)) {
            throw new Error('Executor address must be a valid Ethereum address (0x followed by 40 hex characters)');
        }

        console.log(chalk.green('✅ Executor address validated'));
        console.log(chalk.gray('Executor:'), chalk.white(address));

        return true;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid executor address: ${errorMessage}`);
    }
}

/**
 * Sign CID with retry mechanism
 */
async function signCidWithRetry(cid: string, privateKey: string, retryCount: number = 0): Promise<string> {
    try {
        console.log(chalk.blue('Generating signature for CID...'));
        console.log(chalk.gray('Attempt:'), retryCount + 1);

        const signature = await signString(cid, privateKey);

        if (!signature) {
            throw new Error('Signature generation returned null or undefined');
        }

        if (typeof signature !== 'string') {
            throw new Error('Signature must be a string');
        }

        console.log(chalk.green('✅ Signature generated successfully'));
        console.log(chalk.gray('Signature:'), `${signature.substring(0, 10)}...${signature.substring(signature.length - 8)}`);

        return signature;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`❌ Signature generation failed (attempt ${retryCount + 1}):`), errorMessage);

        // Retry logic
        if (retryCount < SIGNATURE_CONFIG.maxRetries) {
            console.log(chalk.yellow(`⚠️ Retrying signature generation (attempt ${retryCount + 2}/${SIGNATURE_CONFIG.maxRetries + 1})...`));

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, SIGNATURE_CONFIG.retryDelay));

            return signCidWithRetry(cid, privateKey, retryCount + 1);
        }

        throw new Error(`Signature generation failed after ${SIGNATURE_CONFIG.maxRetries + 1} attempts: ${errorMessage}`);
    }
}

/**
 * Verify signature with detailed validation
 */
async function verifySignatureWithDetails(cid: string, signature: string, executorAddress: string): Promise<boolean> {
    try {
        console.log(chalk.blue('Verifying signature...'));
        console.log(chalk.gray('Message (CID):'), cid);
        console.log(chalk.gray('Signature:'), `${signature.substring(0, 10)}...${signature.substring(signature.length - 8)}`);
        console.log(chalk.gray('Expected signer:'), executorAddress);

        const isValid = await verify(cid, signature, executorAddress);

        if (!isValid) {
            throw new Error('Signature verification failed - signature does not match the expected signer');
        }

        console.log(chalk.green('✅ Signature verified successfully'));
        console.log(chalk.gray('Verified signer:'), executorAddress);

        return true;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Signature verification failed: ${errorMessage}`);
    }
}

/**
 * Update environment variable with signature
 */
async function updateEnvironmentVariable(signature: string): Promise<void> {
    try {
        console.log(chalk.blue('Updating environment variables...'));

        await updateEnvVariable('EXECUTOR_SIGNATURE', signature);

        console.log(chalk.green('✅ Environment variable updated successfully'));
        console.log(chalk.gray('Updated variable: EXECUTOR_SIGNATURE'));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to update environment variable: ${errorMessage}`);
    }
}

/**
 * Process CID signing workflow
 */
async function processCidSigning(): Promise<ProcessResult> {
    try {
        // Validate environment variables
        const { CID, EXECUTOR_PRIVATE_KEY, EXECUTOR } = validateEnvironment();

        // Validate inputs
        validateCid(CID);
        const cleanPrivateKey = validatePrivateKey(EXECUTOR_PRIVATE_KEY);
        validateExecutorAddress(EXECUTOR);

        console.log(chalk.cyan('\n🔐 Starting CID signing process...'));
        console.log(chalk.gray('CID to sign:'), CID);
        console.log(chalk.gray('Executor address:'), EXECUTOR);

        // Generate signature with retry mechanism
        const signature = await signCidWithRetry(CID, cleanPrivateKey);

        // Verify signature
        await verifySignatureWithDetails(CID, signature, EXECUTOR);

        // Update environment variable
        await updateEnvironmentVariable(signature);

        console.log(chalk.green.bold('\n🎉 CID signing process completed successfully!'));

        return {
            cid: CID,
            signature,
            executor: EXECUTOR,
            signatureLength: signature.length,
            success: true
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Error during CID signing process:'), errorMessage);
        throw error;
    }
}

/**
 * Main function
 */
async function main(): Promise<void> {
    try {
        console.log(chalk.cyan('=== CID Signature Generation & Verification ===\n'));

        const result = await processCidSigning();

        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
        console.log(chalk.gray('Results:'), {
            cid: result.cid,
            executor: result.executor,
            signatureLength: result.signatureLength,
            success: result.success
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red.bold('\n❌ Program execution failed:'), errorMessage);

        // Use assert for critical validation failures
        if (errorMessage.includes('verification failed')) {
            assert(false, chalk.red('Critical: Signature verification failed - this indicates a serious security issue'));
        }

        // Log stack trace in development mode
        if (process.env.NODE_ENV === 'development' && error instanceof Error) {
            console.error(chalk.gray('Stack trace:'), error.stack);
        }

        process.exit(1);
    }
}

// Execute main function
main().catch((error: Error) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red.bold('Uncaught error:'), errorMessage);
    process.exit(1);
});