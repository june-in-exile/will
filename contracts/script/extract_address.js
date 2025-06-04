const fs = require('fs');
const path = require('path');

/**
 * Extract contract information from Foundry broadcast files
 */
class ContractAddressExtractor {
    constructor() {
        this.broadcastDir = path.join(__dirname, '..', 'broadcast');
    }

    /**
     * Extract contract address
     * @param {string} contractName - Contract name
     * @param {string} chainId - Chain ID
     * @param {Object} options - Options
     * @returns {Object} - Result object
     */
    extract(contractName, chainId, options = {}) {
        const { verbose = false, fallback = true } = options;

        const result = {
            success: false,
            address: null,
            source: null,
            contractName: null,
            transactionHash: null,
            blockNumber: null,
            gasUsed: null,
            error: null
        };

        try {
            const broadcastPath = this.getBroadcastPath(contractName, chainId);
            
            if (verbose) {
                console.log(`🔍 Reading: ${broadcastPath}`);
            }

            if (!fs.existsSync(broadcastPath)) {
                if (fallback) {
                    return this.findAlternativeBroadcast(contractName, chainId, verbose);
                }
                result.error = `Broadcast file not found: ${broadcastPath}`;
                return result;
            }

            const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
            
            // Priority: Extract from receipts
            const receiptResult = this.extractFromReceipts(broadcastData, verbose);
            if (receiptResult.success) {
                return receiptResult;
            }

            // Fallback: Extract from transactions
            const transactionResult = this.extractFromTransactions(broadcastData, verbose);
            if (transactionResult.success) {
                return transactionResult;
            }

            result.error = 'No contract address found in broadcast file';
            return result;

        } catch (error) {
            result.error = `Error processing broadcast file: ${error.message}`;
            return result;
        }
    }

    /**
     * Extract address from receipts
     */
    extractFromReceipts(broadcastData, verbose = false) {
        const result = { success: false, address: null, source: 'receipts' };

        if (!broadcastData.receipts || broadcastData.receipts.length === 0) {
            return result;
        }

        for (const receipt of broadcastData.receipts) {
            if (receipt.contractAddress && this.isValidAddress(receipt.contractAddress)) {
                result.success = true;
                result.address = receipt.contractAddress;
                result.transactionHash = receipt.transactionHash;
                result.blockNumber = receipt.blockNumber;
                result.gasUsed = receipt.gasUsed;
                
                if (verbose) {
                    console.log(`✅ Found in receipts: ${receipt.contractAddress}`);
                }
                
                return result;
            }
        }

        return result;
    }

    /**
     * Extract address from transactions
     */
    extractFromTransactions(broadcastData, verbose = false) {
        const result = { success: false, address: null, source: 'transactions' };

        if (!broadcastData.transactions || broadcastData.transactions.length === 0) {
            return result;
        }

        for (const transaction of broadcastData.transactions) {
            if (transaction.transactionType === 'CREATE' && 
                transaction.contractAddress && 
                this.isValidAddress(transaction.contractAddress)) {
                
                result.success = true;
                result.address = transaction.contractAddress;
                result.contractName = transaction.contractName;
                result.transactionHash = transaction.hash;
                
                if (verbose) {
                    console.log(`✅ Found in transactions: ${transaction.contractAddress}`);
                }
                
                return result;
            }
        }

        return result;
    }

    /**
     * Find alternative broadcast files
     */
    findAlternativeBroadcast(contractName, chainId, verbose = false) {
        const result = { success: false, address: null, error: null };

        try {
            const contractDir = path.join(this.broadcastDir, `${contractName}.s.sol`, chainId);
            
            if (!fs.existsSync(contractDir)) {
                result.error = `Contract directory not found: ${contractDir}`;
                return result;
            }

            // Find other run files
            const files = fs.readdirSync(contractDir)
                .filter(file => file.startsWith('run-') && file.endsWith('.json'))
                .sort()
                .reverse(); // Latest first

            if (verbose) {
                console.log(`🔍 Found ${files.length} alternative files: ${files.join(', ')}`);
            }

            for (const file of files) {
                const filePath = path.join(contractDir, file);
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const extractResult = this.extractFromReceipts(data, verbose) || 
                                         this.extractFromTransactions(data, verbose);
                    
                    if (extractResult.success) {
                        extractResult.source = `alternative:${file}`;
                        return extractResult;
                    }
                } catch (error) {
                    if (verbose) {
                        console.log(`⚠️  Failed to read ${file}: ${error.message}`);
                    }
                }
            }

            result.error = 'No valid contract address found in any broadcast files';
            return result;

        } catch (error) {
            result.error = `Error searching alternative files: ${error.message}`;
            return result;
        }
    }

    /**
     * Get broadcast file path
     */
    getBroadcastPath(contractName, chainId) {
        return path.join(this.broadcastDir, `${contractName}.s.sol`, chainId, 'run-latest.json');
    }

    /**
     * Validate Ethereum address
     */
    isValidAddress(address) {
        return typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * List all available contracts
     */
    listAvailableContracts() {
        try {
            if (!fs.existsSync(this.broadcastDir)) {
                return [];
            }

            return fs.readdirSync(this.broadcastDir)
                .filter(dir => dir.endsWith('.s.sol'))
                .map(dir => dir.replace('.s.sol', ''));
        } catch (error) {
            return [];
        }
    }

    /**
     * List all available chains for a contract
     */
    listAvailableChains(contractName) {
        try {
            const contractDir = path.join(this.broadcastDir, `${contractName}.s.sol`);
            
            if (!fs.existsSync(contractDir)) {
                return [];
            }

            return fs.readdirSync(contractDir)
                .filter(dir => {
                    const dirPath = path.join(contractDir, dir);
                    return fs.statSync(dirPath).isDirectory();
                });
        } catch (error) {
            return [];
        }
    }
}

/**
 * Command Line Interface
 */
function main() {
    const args = process.argv.slice(2);
    const extractor = new ContractAddressExtractor();

    // Handle help command
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    // Handle list command
    if (args.includes('--list') || args.includes('-l')) {
        const contracts = extractor.listAvailableContracts();
        console.log('📋 Available contracts:');
        contracts.forEach(contract => {
            const chains = extractor.listAvailableChains(contract);
            console.log(`  ${contract}: [${chains.join(', ')}]`);
        });
        return;
    }

    // Main extraction functionality
    if (args.length < 2) {
        console.error('❌ Usage: node extract_address.js <CONTRACT_NAME> <CHAIN_ID> [options]');
        console.error('📝 Use --help for more information');
        process.exit(1);
    }

    const [contractName, chainId] = args;
    const verbose = args.includes('--verbose') || args.includes('-v');
    const json = args.includes('--json') || args.includes('-j');

    if (verbose) {
        console.log(`🚀 Extracting contract address for ${contractName} on chain ${chainId}`);
    }

    const result = extractor.extract(contractName, chainId, { verbose, fallback: true });

    if (json) {
        console.log(JSON.stringify(result, null, 2));
    } else if (result.success) {
        if (verbose) {
            console.log(`🎉 Success!`);
            console.log(`📍 Address: ${result.address}`);
            console.log(`📂 Source: ${result.source}`);
            if (result.contractName) console.log(`📋 Contract: ${result.contractName}`);
            if (result.transactionHash) console.log(`🔗 TX Hash: ${result.transactionHash}`);
            if (result.blockNumber) console.log(`📊 Block: ${result.blockNumber}`);
        } else {
            // Only output address (for script use)
            process.stdout.write(result.address);
        }
        process.exit(0);
    } else {
        console.error(`❌ Failed: ${result.error}`);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
📄 Contract Address Extractor

Usage: node extract_address.js <CONTRACT_NAME> <CHAIN_ID> [options]

Arguments:
  CONTRACT_NAME   Name of the contract (e.g., TestamentFactory)
  CHAIN_ID       Chain ID (e.g., 421614)

Options:
  -v, --verbose   Show detailed output
  -j, --json      Output result as JSON
  -l, --list      List available contracts and chains
  -h, --help      Show this help message

Examples:
  node extract_address.js TestamentFactory 421614
  node extract_address.js TestamentFactory 421614 --verbose
  node extract_address.js TestamentFactory 421614 --json
  node extract_address.js --list
`);
}

// Execute main function
if (require.main === module) {
    main();
}

module.exports = ContractAddressExtractor;