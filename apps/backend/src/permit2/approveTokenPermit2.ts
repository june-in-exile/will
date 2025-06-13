import { PATHS_CONFIG, APPROVAL_CONFIG, NETWORK_CONFIG } from '@shared/config.js';
import { readFileSync, existsSync } from 'fs';
import { ethers, JsonRpcProvider, Wallet, Network } from 'ethers';
import { config } from 'dotenv';
import { createRequire } from 'module';
import chalk from 'chalk';

const require = createRequire(import.meta.url);

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Load Permit2 SDK
const permit2SDK = require('@uniswap/permit2-sdk');

// Type definitions
interface EnvironmentVariables {
    TESTATOR_PRIVATE_KEY: string;
    PERMIT2_ADDRESS: string;
}

interface TokenInfo {
    name: string;
    symbol: string;
    decimals: number;
}

interface TokenDetails {
    address: string;
    estates: number[];
    totalAmount: bigint;
}

interface ApprovalResult {
    success: boolean;
    txHash: string | null;
    alreadyApproved: boolean;
    error?: string;
}

interface TokenApprovalSummary {
    total: number;
    successful: number;
    alreadyApproved: number;
    failed: number;
    results: Array<{ token: string } & ApprovalResult>;
    allSuccessful: boolean;
}

interface WorkflowResult extends TokenApprovalSummary {
    permit2Address: string;
    signerAddress: string;
    success: boolean;
    message?: string;
}

interface Estate {
    token: string;
    amount: string;
    beneficiary?: string;
}

interface TestamentData {
    estates: Estate[];
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
    const { TESTATOR_PRIVATE_KEY, PERMIT2_ADDRESS } = process.env;

    if (!TESTATOR_PRIVATE_KEY) {
        throw new Error('Environment variable TESTATOR_PRIVATE_KEY is not set');
    }

    if (TESTATOR_PRIVATE_KEY.length !== 64 && TESTATOR_PRIVATE_KEY.length !== 66) {
        throw new Error('Invalid private key format');
    }

    const permit2Address = PERMIT2_ADDRESS || permit2SDK.PERMIT2_ADDRESS;
    if (!permit2Address) {
        throw new Error('PERMIT2_ADDRESS not found in environment or SDK');
    }

    if (!ethers.isAddress(permit2Address)) {
        throw new Error(`Invalid PERMIT2_ADDRESS: ${permit2Address}`);
    }

    return { TESTATOR_PRIVATE_KEY, PERMIT2_ADDRESS: permit2Address };
}

/**
 * Validate file existence
 */
function validateFiles(): void {
    if (!existsSync(PATHS_CONFIG.testament.formatted)) {
        throw new Error(`Formatted testament file does not exist: ${PATHS_CONFIG.testament.formatted}`);
    }
}

/**
 * Create and validate signer
 */
async function createSigner(privateKey: string, provider: JsonRpcProvider): Promise<Wallet> {
    try {
        console.log(chalk.blue('Initializing signer...'));
        const signer = new ethers.Wallet(privateKey, provider);

        const address = await signer.getAddress();
        const balance = await signer.provider!.getBalance(address);

        console.log(chalk.green('✅ Signer initialized:'), chalk.white(address));
        console.log(chalk.gray('Balance:'), ethers.formatEther(balance), 'ETH');

        if (balance === 0n) {
            console.warn(chalk.yellow('⚠️ Warning: Signer has zero balance for gas fees'));
        }

        return signer;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create signer: ${errorMessage}`);
    }
}

/**
 * Validate network connection
 */
async function validateNetwork(provider: JsonRpcProvider): Promise<Network> {
    try {
        console.log(chalk.blue('Validating network connection...'));
        const network = await provider.getNetwork();
        const gasPrice = await provider.getFeeData();

        console.log(chalk.green('✅ Connected to network:'), network.name);
        console.log(chalk.gray('Chain ID:'), network.chainId.toString());
        console.log(chalk.gray('Gas price:'), ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei'), 'gwei');

        return network;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to network: ${errorMessage}`);
    }
}

/**
 * Read and validate testament data
 */
function readTestamentData(): TestamentData {
    try {
        console.log(chalk.blue('Reading formatted testament data...'));
        const testamentContent = readFileSync(PATHS_CONFIG.testament.formatted, 'utf8');
        const testamentJson: TestamentData = JSON.parse(testamentContent);

        // Validate required fields
        if (!testamentJson.estates || !Array.isArray(testamentJson.estates)) {
            throw new Error('Missing or invalid estates array');
        }

        if (testamentJson.estates.length === 0) {
            throw new Error('Estates array cannot be empty');
        }

        // Validate each estate
        testamentJson.estates.forEach((estate, index) => {
            if (!estate.token) {
                throw new Error(`Missing token address in estate ${index}`);
            }

            if (!ethers.isAddress(estate.token)) {
                throw new Error(`Invalid token address in estate ${index}: ${estate.token}`);
            }

            if (!estate.amount) {
                throw new Error(`Missing amount in estate ${index}`);
            }

            // Validate amount is a valid number
            try {
                BigInt(estate.amount);
            } catch {
                throw new Error(`Invalid amount in estate ${index}: ${estate.amount}`);
            }
        });

        console.log(chalk.green('✅ Testament data validated successfully'));
        console.log(chalk.gray('Estates count:'), testamentJson.estates.length);

        return testamentJson;

    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in testament file: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Extract unique tokens from estates
 */
function extractUniqueTokens(estates: Estate[]): { tokens: string[]; tokenDetails: Map<string, TokenDetails> } {
    const uniqueTokens = new Set<string>();
    const tokenDetails = new Map<string, TokenDetails>();

    estates.forEach((estate, index) => {
        const token = estate.token.toLowerCase(); // Normalize to lowercase
        uniqueTokens.add(estate.token); // Keep original case for contract calls

        if (!tokenDetails.has(token)) {
            tokenDetails.set(token, {
                address: estate.token,
                estates: [index],
                totalAmount: BigInt(estate.amount)
            });
        } else {
            const details = tokenDetails.get(token)!;
            details.estates.push(index);
            details.totalAmount += BigInt(estate.amount);
        }
    });

    const tokens = Array.from(uniqueTokens);

    console.log(chalk.blue(`Found ${tokens.length} unique tokens to approve:`));
    tokens.forEach(token => {
        const details = tokenDetails.get(token.toLowerCase())!;
        console.log(chalk.gray(`- ${token} (used in estates: ${details.estates.join(', ')})`));
    });

    return { tokens, tokenDetails };
}

/**
 * Get token information
 */
async function getTokenInfo(tokenAddress: string, signer: Wallet): Promise<TokenInfo> {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, APPROVAL_CONFIG.tokenAbi, signer);

        const [name, symbol, decimals] = await Promise.all([
            tokenContract.name().catch(() => 'Unknown'),
            tokenContract.symbol().catch(() => 'UNKNOWN'),
            tokenContract.decimals().catch(() => 18)
        ]);

        return { name, symbol, decimals };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(chalk.yellow(`⚠️ Could not fetch token info for ${tokenAddress}:`, errorMessage));
        return { name: 'Unknown', symbol: 'UNKNOWN', decimals: 18 };
    }
}

/**
 * Check current allowance
 */
async function checkCurrentAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    signer: Wallet
): Promise<bigint> {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, APPROVAL_CONFIG.tokenAbi, signer);
        const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
        return allowance;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(chalk.yellow(`⚠️ Could not check allowance for ${tokenAddress}:`, errorMessage));
        return 0n;
    }
}

/**
 * Approve token with retry mechanism
 */
async function approveToken(
    tokenAddress: string,
    spenderAddress: string,
    signer: Wallet,
    retryCount: number = 0
): Promise<ApprovalResult> {
    try {
        console.log(chalk.blue(`Approving token ${tokenAddress} for Permit2...`));

        // Get token info
        const tokenInfo = await getTokenInfo(tokenAddress, signer);
        console.log(chalk.gray(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`));

        // Check current allowance
        const ownerAddress = await signer.getAddress();
        const currentAllowance = await checkCurrentAllowance(tokenAddress, ownerAddress, spenderAddress, signer);

        if (currentAllowance >= ethers.MaxUint256 / 2n) {
            console.log(chalk.green(`✅ Token ${tokenAddress} already has sufficient allowance`));
            return { success: true, txHash: null, alreadyApproved: true };
        }

        // Create contract instance
        const tokenContract = new ethers.Contract(tokenAddress, APPROVAL_CONFIG.tokenAbi, signer);

        // Estimate gas
        let gasLimit: bigint;
        try {
            const estimatedGas = await tokenContract.approve.estimateGas(spenderAddress, ethers.MaxUint256);
            gasLimit = (estimatedGas * BigInt(Math.floor(APPROVAL_CONFIG.gasLimitMultiplier * 100))) / 100n;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(`❌ Error estimating gas, using default limit:`), errorMessage);
            gasLimit = 100000n; // Default gas limit for approvals
        }

        // Send approval transaction
        const tx = await tokenContract.approve(spenderAddress, ethers.MaxUint256, {
            gasLimit
        });

        console.log(chalk.gray(`Approval transaction sent for ${tokenAddress}:`), chalk.white(tx.hash));

        // Wait for confirmation
        const receipt = await tx.wait(APPROVAL_CONFIG.confirmationBlocks);

        if (receipt!.status === 1) {
            console.log(chalk.green(`✅ Approval confirmed for ${tokenAddress} (${tokenInfo.symbol})`));
            return { success: true, txHash: tx.hash, alreadyApproved: false };
        } else {
            throw new Error('Transaction failed');
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`❌ Error approving token ${tokenAddress}:`), errorMessage);

        // Retry logic
        if (retryCount < APPROVAL_CONFIG.maxRetries) {
            console.log(chalk.yellow(`⚠️ Retrying approval for ${tokenAddress} (attempt ${retryCount + 1}/${APPROVAL_CONFIG.maxRetries})...`));

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, APPROVAL_CONFIG.retryDelay));

            return approveToken(tokenAddress, spenderAddress, signer, retryCount + 1);
        }

        return { success: false, error: errorMessage, txHash: null, alreadyApproved: false };
    }
}

/**
 * Process all token approvals
 */
async function processTokenApprovals(
    tokens: string[],
    spenderAddress: string,
    signer: Wallet
): Promise<TokenApprovalSummary> {
    console.log(chalk.blue('\n🔐 Starting token approval process...'));

    const results: Array<{ token: string } & ApprovalResult> = [];
    const successful: string[] = [];
    const failed: Array<{ token: string; error: string }> = [];
    const alreadyApproved: string[] = [];

    // Process approvals with controlled concurrency
    for (const token of tokens) {
        console.log(chalk.cyan(`\n--- Processing ${token} ---`));

        const result = await approveToken(token, spenderAddress, signer);
        results.push({ token, ...result });

        if (result.success) {
            if (result.alreadyApproved) {
                alreadyApproved.push(token);
            } else {
                successful.push(token);
            }
        } else {
            failed.push({ token, error: result.error || 'Unknown error' });
        }

        // Small delay between approvals to avoid rate limiting
        if (tokens.indexOf(token) < tokens.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Display summary
    console.log(chalk.cyan('\n📊 Approval Summary:'));
    console.log(chalk.green(`✅ Successful approvals: ${successful.length}`));
    console.log(chalk.gray(`ℹ️  Already approved: ${alreadyApproved.length}`));
    console.log(chalk.red(`❌ Failed approvals: ${failed.length}`));

    if (successful.length > 0) {
        console.log(chalk.green('\n✅ Successfully approved:'));
        successful.forEach(token => console.log(chalk.gray(`- ${token}`)));
    }

    if (alreadyApproved.length > 0) {
        console.log(chalk.gray('\nℹ️  Already approved:'));
        alreadyApproved.forEach(token => console.log(chalk.gray(`- ${token}`)));
    }

    if (failed.length > 0) {
        console.log(chalk.red('\n❌ Failed approvals:'));
        failed.forEach(({ token, error }) => {
            console.log(chalk.red(`- ${token}: ${error}`));
        });
    }

    return {
        total: tokens.length,
        successful: successful.length,
        alreadyApproved: alreadyApproved.length,
        failed: failed.length,
        results,
        allSuccessful: failed.length === 0
    };
}

/**
 * Process token approval workflow
 */
async function processTokenApprovalWorkflow(): Promise<WorkflowResult> {
    try {
        // Validate prerequisites
        validateFiles();
        const { TESTATOR_PRIVATE_KEY, PERMIT2_ADDRESS } = validateEnvironment();

        // Initialize provider and validate network
        const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
        await validateNetwork(provider);

        // Create and validate signer
        const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

        // Read and validate testament data
        const testamentData = readTestamentData();

        // Extract unique tokens
        const { tokens } = extractUniqueTokens(testamentData.estates);

        if (tokens.length === 0) {
            console.log(chalk.yellow('⚠️ No tokens found to approve'));
            return { 
                success: true, 
                message: 'No tokens to approve',
                total: 0,
                successful: 0,
                alreadyApproved: 0,
                failed: 0,
                results: [],
                allSuccessful: true,
                permit2Address: PERMIT2_ADDRESS,
                signerAddress: await signer.getAddress()
            };
        }

        // Process approvals
        const approvalResults = await processTokenApprovals(tokens, PERMIT2_ADDRESS, signer);

        if (approvalResults.allSuccessful) {
            console.log(chalk.green.bold('\n🎉 All token approvals completed successfully!'));
        } else {
            console.log(chalk.yellow.bold('\n⚠️ Some token approvals failed. Please check the logs above.'));
        }

        return {
            ...approvalResults,
            permit2Address: PERMIT2_ADDRESS,
            signerAddress: await signer.getAddress(),
            success: true
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Error during token approval process:'), errorMessage);
        throw error;
    }
}

/**
 * Main function
 */
async function main(): Promise<void> {
    try {
        console.log(chalk.cyan('=== Token Approval for Permit2 ===\n'));

        const result = await processTokenApprovalWorkflow();

        console.log(chalk.green.bold('\n✅ Process completed!'));
        console.log(chalk.gray('Results:'), {
            total: result.total,
            successful: result.successful,
            alreadyApproved: result.alreadyApproved,
            failed: result.failed,
            allSuccessful: result.allSuccessful
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