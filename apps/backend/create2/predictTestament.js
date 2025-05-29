import { PATHS_CONFIG, NETWORK_CONFIG, SALT_CONFIG } from '../config.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { updateFoundryEnvVariable } from '../utils/others/updateEnvVariable.js';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import chalk from 'chalk';

const modulePath = dirname(fileURLToPath(import.meta.url));

// Load environment configuration
config({ path: PATHS_CONFIG.env.foundry });

/**
 * Validate environment variables
 */
function validateEnvironment() {
    const { TESTAMENT_FACTORY_ADDRESS } = process.env;

    if (!TESTAMENT_FACTORY_ADDRESS) {
        throw new Error('Environment variable TESTAMENT_FACTORY_ADDRESS is not set');
    }

    if (!ethers.isAddress(TESTAMENT_FACTORY_ADDRESS)) {
        throw new Error(`Invalid testament factory address: ${TESTAMENT_FACTORY_ADDRESS}`);
    }

    return { TESTAMENT_FACTORY_ADDRESS };
}

/**
 * Validate file existence
 */
function validateFiles() {
    if (!existsSync(PATHS_CONFIG.testament.formatted)) {
        throw new Error(`Formatted testament file does not exist: ${PATHS_CONFIG.testament.formatted}`);
    }
}

/**
 * Validate RPC connection
 */
async function validateRpcConnection(provider) {
    try {
        console.log(chalk.blue('Validating RPC connection...'));
        const network = await provider.getNetwork();
        console.log(chalk.green('✅ Connected to network:'), network.name, `(Chain ID: ${network.chainId})`);
        return network;
    } catch (error) {
        throw new Error(`Failed to connect to RPC endpoint: ${error.message}`);
    }
}

/**
 * Load contract ABI from artifact
 */
function getContractAbi(contractName) {
    try {
        const artifactPath = resolve(modulePath, `../../foundry/out/${contractName}.sol/${contractName}.json`);

        if (!existsSync(artifactPath)) {
            throw new Error(`Contract artifact not found: ${artifactPath}`);
        }

        const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

        if (!artifact.abi || !Array.isArray(artifact.abi)) {
            throw new Error(`Invalid ABI in artifact for ${contractName}`);
        }

        console.log(chalk.gray(`✅ Loaded ABI for ${contractName}`));
        return artifact.abi;

    } catch (error) {
        throw new Error(`Failed to load ABI for ${contractName}: ${error.message}`);
    }
}

/**
 * Generate cryptographically secure salt
 */
function generateSecureSalt(timestamp = Date.now()) {
    try {
        const randomArray = new Uint32Array(1);
        crypto.getRandomValues(randomArray);

        const randomPart = randomArray[0] % SALT_CONFIG.timestampMultiplier;
        const salt = (timestamp * SALT_CONFIG.timestampMultiplier + randomPart) % SALT_CONFIG.maxSafeInteger;

        console.log(chalk.gray('Generated salt:'), salt);
        return salt;

    } catch (error) {
        throw new Error(`Failed to generate salt: ${error.message}`);
    }
}

/**
 * Read and validate testament data
 */
function readTestamentData() {
    try {
        console.log(chalk.blue('Reading formatted testament data...'));
        const testamentContent = readFileSync(PATHS_CONFIG.testament.formatted, 'utf8');
        const testamentJson = JSON.parse(testamentContent);

        // Validate required fields
        if (!testamentJson.testator) {
            throw new Error('Missing required field: testator');
        }

        if (!testamentJson.estates || !Array.isArray(testamentJson.estates)) {
            throw new Error('Missing or invalid estates array');
        }

        if (testamentJson.estates.length === 0) {
            throw new Error('Estates array cannot be empty');
        }

        // Validate estate structure
        testamentJson.estates.forEach((estate, index) => {
            const requiredFields = ['beneficiary', 'token', 'amount'];
            for (const field of requiredFields) {
                if (!estate[field]) {
                    throw new Error(`Missing required field '${field}' in estate ${index}`);
                }
            }

            // Validate addresses
            if (!ethers.isAddress(estate.beneficiary)) {
                throw new Error(`Invalid beneficiary address in estate ${index}: ${estate.beneficiary}`);
            }

            if (!ethers.isAddress(estate.token)) {
                throw new Error(`Invalid token address in estate ${index}: ${estate.token}`);
            }
        });

        console.log(chalk.green('✅ Testament data validated successfully'));
        return testamentJson;

    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in testament file: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(factoryAddress, provider) {
    try {
        console.log(chalk.blue('Loading testament factory contract...'));
        const abi = getContractAbi('TestamentFactory');
        const contract = new ethers.Contract(factoryAddress, abi, provider);

        // Validate contract exists at address
        const code = await provider.getCode(factoryAddress);
        if (code === '0x') {
            throw new Error(`No contract found at address: ${factoryAddress}`);
        }

        console.log(chalk.green('✅ Testament factory contract loaded'));
        return contract;

    } catch (error) {
        throw new Error(`Failed to create contract instance: ${error.message}`);
    }
}

/**
 * Predict testament address
 */
async function predictTestamentAddress(contract, testator, estates, salt) {
    try {
        console.log(chalk.blue('Predicting testament address...'));
        console.log(chalk.gray('Parameters:'));
        console.log(chalk.gray('- Testator:'), testator);
        console.log(chalk.gray('- Estates count:'), estates.length);
        console.log(chalk.gray('- Salt:'), salt);

        const predictedAddress = await contract.predictTestament(testator, estates, salt);

        if (!ethers.isAddress(predictedAddress)) {
            throw new Error(`Invalid predicted address: ${predictedAddress}`);
        }

        console.log(chalk.green('✅ Testament address predicted:'), chalk.white(predictedAddress));
        return predictedAddress;

    } catch (error) {
        throw new Error(`Failed to predict testament address: ${error.message}`);
    }
}

/**
 * Save addressed testament
 */
function saveAddressedTestament(testamentData, salt, predictedAddress) {
    try {
        console.log(chalk.blue('Preparing addressed testament...'));

        const addressedTestament = {
            ...testamentData,
            salt: salt,
            testament: predictedAddress,
            timestamp: new Date().toISOString(),
            metadata: {
                predictedAt: Date.now(),
                estatesCount: testamentData.estates.length
            }
        };

        writeFileSync(PATHS_CONFIG.testament.addressed, JSON.stringify(addressedTestament, null, 4));
        console.log(chalk.green('✅ Addressed testament saved to:'), PATHS_CONFIG.testament.addressed);

        return addressedTestament;

    } catch (error) {
        throw new Error(`Failed to save addressed testament: ${error.message}`);
    }
}

/**
 * Update environment variables with estate and contract data
 */
async function updateEnvironmentVariables(estates, salt, predictedAddress) {
    try {
        console.log(chalk.blue('Updating environment variables...'));

        const updates = [
            // Testament contract info
            ['SALT', salt.toString()],
            ['TESTAMENT_ADDRESS', predictedAddress]
        ];

        // Add estate-specific variables
        estates.forEach((estate, index) => {
            updates.push(
                [`BENEFICIARY${index}`, estate.beneficiary],
                [`TOKEN${index}`, estate.token],
                [`AMOUNT${index}`, estate.amount.toString()]
            );
        });

        // Execute all updates in parallel
        await Promise.all(
            updates.map(([key, value]) => updateFoundryEnvVariable(key, value))
        );

        console.log(chalk.green('✅ Environment variables updated successfully'));
        console.log(chalk.gray('Updated variables:'));
        updates.forEach(([key, value]) => {
            const displayValue = value.length > 42 ? `${value.substring(0, 42)}...` : value;
            console.log(chalk.gray(`- ${key}:`), displayValue);
        });

    } catch (error) {
        throw new Error(`Failed to update environment variables: ${error.message}`);
    }
}

/**
 * Process testament addressing workflow
 */
async function processTestamentAddressing() {
    try {
        // Validate prerequisites
        validateFiles();
        const { TESTAMENT_FACTORY_ADDRESS } = validateEnvironment();

        // Initialize provider and validate connection
        const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
        await validateRpcConnection(provider);

        // Create contract instance
        const contract = await createContractInstance(TESTAMENT_FACTORY_ADDRESS, provider);

        // Read and validate testament data
        const testamentData = readTestamentData();

        // Generate salt
        const salt = generateSecureSalt();

        // Predict testament address
        const predictedAddress = await predictTestamentAddress(
            contract,
            testamentData.testator,
            testamentData.estates,
            salt
        );

        // Save addressed testament
        const addressedTestament = saveAddressedTestament(testamentData, salt, predictedAddress);

        // Update environment variables
        await updateEnvironmentVariables(testamentData.estates, salt, predictedAddress);

        console.log(chalk.green.bold('\n🎉 Testament addressing process completed successfully!'));

        return {
            predictedAddress,
            salt,
            estatesCount: testamentData.estates.length,
            outputPath: PATHS_CONFIG.testament.addressed,
            success: true
        };

    } catch (error) {
        console.error(chalk.red('Error during testament addressing process:'), error.message);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log(chalk.cyan('=== Testament Address Prediction & Environment Setup ===\n'));

        const result = await processTestamentAddressing();

        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
        console.log(chalk.gray('Results:'), result);

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