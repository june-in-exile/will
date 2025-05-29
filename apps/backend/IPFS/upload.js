import { PATHS_CONFIG, IPFS_CONFIG } from '../config.js';
import { createHelia } from 'helia';
import { json } from '@helia/json';
import { updateEnvVariable } from '../utils/others/updateEnvVariable.js';
import { keccak256 } from '../utils/crypto/hash.js';
import { readFileSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execPromise = promisify(exec);

/**
 * Validate file existence and readability
 */
function validateFiles() {
    if (!existsSync(PATHS_CONFIG.testament.encrypted)) {
        throw new Error(`Encrypted testament file does not exist: ${PATHS_CONFIG.testament.encrypted}`);
    }
}

/**
 * Read and validate testament data
 */
function readTestamentData() {
    try {
        console.log(chalk.blue('Reading encrypted testament data...'));
        const testamentContent = readFileSync(PATHS_CONFIG.testament.encrypted, 'utf8');
        const testamentJson = JSON.parse(testamentContent);

        // Validate required fields
        const requiredFields = ['ciphertext', 'iv', 'authTag'];
        for (const field of requiredFields) {
            if (!testamentJson[field]) {
                throw new Error(`Missing required field in testament: ${field}`);
            }
        }

        console.log(chalk.gray('Testament data structure validated'));
        return testamentJson;

    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in testament file: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Create and configure Helia instance
 */
async function createHeliaInstance() {
    try {
        console.log(chalk.blue('Initializing Helia IPFS node...'));
        const helia = await createHelia();
        const jsonHandler = json(helia);

        console.log(chalk.green('✅ Helia instance created successfully'));
        return { helia, jsonHandler };

    } catch (error) {
        throw new Error(`Failed to create Helia instance: ${error.message}`);
    }
}

/**
 * Upload data to IPFS
 */
async function uploadToIPFS(jsonHandler, testamentData) {
    try {
        console.log(chalk.blue('Uploading encrypted testament to IPFS...'));
        const cid = await jsonHandler.add(testamentData);

        console.log(chalk.green('✅ Data uploaded successfully'));
        console.log(chalk.gray('CID:'), chalk.white(cid.toString()));

        return cid;

    } catch (error) {
        throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
}

/**
 * Pin content in local IPFS daemon with retry mechanism
 * Now throws error on failure instead of returning false
 */
async function pinInLocalDaemon(cid, retryAttempts = IPFS_CONFIG.pinning.retryAttempts) {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
            console.log(chalk.blue(`Attempting to pin in local IPFS daemon (attempt ${attempt}/${retryAttempts})...`));

            const { stdout, stderr } = await execPromise(
                `ipfs pin add ${cid.toString()}`,
                { timeout: IPFS_CONFIG.pinning.timeout }
            );

            if (stderr && stderr.trim()) {
                console.warn(chalk.yellow('IPFS daemon warning:'), stderr.trim());
            }

            console.log(chalk.green('✅ Content pinned in local IPFS daemon:'), stdout.trim());
            return true;

        } catch (error) {
            const isLastAttempt = attempt === retryAttempts;

            if (error.code === 'TIMEOUT') {
                console.warn(chalk.yellow(`⚠️ Timeout on attempt ${attempt}: IPFS daemon pinning timed out`));
            } else if (error.code === 'ENOENT') {
                console.error(chalk.red('❌ IPFS CLI not found - please ensure IPFS is installed and in PATH'));
                throw new Error('IPFS CLI not available - pinning failed');
            } else {
                console.warn(chalk.yellow(`⚠️ Attempt ${attempt} failed:`), error.message);
            }

            if (isLastAttempt) {
                console.error(chalk.red('❌ Could not pin in local IPFS daemon after all attempts'));
                console.error(chalk.gray('This might be because:'));
                console.error(chalk.gray('- The daemon is not running'));
                console.error(chalk.gray('- The CID format is incompatible'));
                console.error(chalk.gray('- Network connectivity issues'));

                // Throw error on final failure
                throw new Error(`Failed to pin content in local IPFS daemon after ${retryAttempts} attempts`);
            }
        }
    }
}

/**
 * Display access information
 */
function displayAccessInfo(cid) {
    console.log(chalk.cyan('\n📍 Access Information:'));
    console.log(chalk.gray('CID:'), chalk.white(cid.toString()));

    console.log(chalk.cyan('\n🌐 IPFS Gateways:'));
    IPFS_CONFIG.gateways.forEach((gateway, index) => {
        const url = `${gateway}${cid}`;
        console.log(chalk.gray(`${index + 1}.`), chalk.blue(url));
    });
}

/**
 * Update environment variables
 */
async function updateEnvironmentVariables(cid) {
    try {
        console.log(chalk.blue('Updating environment variables...'));

        const cidString = cid.toString();
        const cidHash = keccak256(cidString);

        // Update environment variables
        await Promise.all([
            updateEnvVariable('CID', cidString),
            updateEnvVariable('CID_HASH', cidHash.toString())
        ]);

        console.log(chalk.green('✅ Environment variables updated successfully'));
        console.log(chalk.gray('Updated variables:'));
        console.log(chalk.gray('- CID:'), cidString);
        console.log(chalk.gray('- CID_HASH:'), cidHash.toString());

    } catch (error) {
        console.error(chalk.red('❌ Failed to update environment variables:'), error.message);
        throw error;
    }
}

/**
 * Process IPFS upload workflow with strict pinning requirement
 */
async function processIPFSUpload() {
    let helia;

    try {
        // Validate prerequisites
        validateFiles();

        // Read and validate testament data
        const testamentData = readTestamentData();

        // Create Helia instance
        const { helia: heliaInstance, jsonHandler } = await createHeliaInstance();
        helia = heliaInstance;

        // Upload to IPFS
        const cid = await uploadToIPFS(jsonHandler, testamentData);

        // Pin in local daemon
        try {
            await pinInLocalDaemon(cid);
            console.log(chalk.green('✅ Local daemon pinning completed successfully'));
        } catch (daemonError) {
            console.error(chalk.red('❌ Local daemon pinning failed - aborting process'));
            throw new Error(`Critical daemon pinning failure: ${daemonError.message}`);
        }

        // Only proceed if both pinning operations succeeded
        console.log(chalk.cyan('\n📋 Finalizing Process...'));
        console.log(chalk.green('All pinning operations completed successfully'));

        // Display access information
        displayAccessInfo(cid);

        // Update environment variables
        await updateEnvironmentVariables(cid);

        console.log(chalk.green.bold('\n🎉 IPFS upload process completed successfully!'));
        console.log(chalk.green('All steps including both pinning operations were successful'));

        return {
            cid: cid.toString(),
            success: true,
            uploadPath: PATHS_CONFIG.testament.encrypted,
            pinnedInHelia: true,
            pinnedLocally: true
        };

    } catch (error) {
        console.error(chalk.red('Error during IPFS upload process:'), error.message);

        // Determine failure type for better error reporting
        if (error.message.includes('pinning failure') || error.message.includes('pin content') || error.message.includes('Helia pinning')) {
            console.error(chalk.red.bold('❌ Process failed due to pinning requirements not met'));

            // Determine which pinning failed
            let failedStage = 'pinning';
            if (error.message.includes('Helia')) {
                failedStage = 'helia_pinning';
            } else if (error.message.includes('daemon')) {
                failedStage = 'daemon_pinning';
            }

            return {
                success: false,
                error: error.message,
                stage: failedStage,
                uploadPath: PATHS_CONFIG.testament.encrypted
            };
        }

        throw error;
    } finally {
        // Clean up Helia instance
        if (helia) {
            try {
                console.log(chalk.blue('Cleaning up Helia instance...'));
                await helia.stop();
                console.log(chalk.gray('✅ Helia instance stopped successfully'));
            } catch (stopError) {
                console.warn(chalk.yellow('⚠️ Warning while stopping Helia:'), stopError.message);
            }
        }
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log(chalk.cyan('=== IPFS Testament Upload & Pinning ===\n'));

        const result = await processIPFSUpload();

        if (result.success) {
            console.log(chalk.green.bold('\n✅ Process completed successfully!'));
            console.log(chalk.gray('Results:'), {
                cid: result.cid,
                pinnedInHelia: result.pinnedInHelia,
                pinnedLocally: result.pinnedLocally,
                success: result.success
            });
        } else {
            console.log(chalk.red.bold('\n❌ Process failed!'));
            console.log(chalk.gray('Error details:'), {
                stage: result.stage,
                error: result.error,
                success: result.success
            });

            // Provide specific guidance based on failure type
            if (result.stage === 'helia_pinning') {
                console.log(chalk.yellow('\n💡 Troubleshooting Helia pinning:'));
                console.log(chalk.gray('- Check Helia node configuration'));
                console.log(chalk.gray('- Verify network connectivity'));
                console.log(chalk.gray('- Check available storage space'));
            } else if (result.stage === 'daemon_pinning') {
                console.log(chalk.yellow('\n💡 Troubleshooting local daemon pinning:'));
                console.log(chalk.gray('- Ensure IPFS daemon is running'));
                console.log(chalk.gray('- Check IPFS CLI installation'));
                console.log(chalk.gray('- Verify daemon API accessibility'));
            }

            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red.bold('\n❌ Program execution failed:'), error.message);

        // Log stack trace in development mode
        if (process.env.NODE_ENV === 'development') {
            console.error(chalk.gray('Stack trace:'), error.stack);
        }

        process.exit(1);
    }
}

// Execute main function
main().catch(error => {
    console.error(chalk.red.bold('Uncaught error:'), error);
    process.exit(1);
});