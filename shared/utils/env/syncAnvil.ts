import { updateEnvVariable } from './updateEnvVariable.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';
import chalk from 'chalk';

// Configuration
const ANVIL_PORT: number = parseInt(process.argv[2]) || 8545;

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Check anvil process
async function checkAnvilProcess(): Promise<boolean> {
    try {
        await execAsync('pgrep -f anvil');
        return true;
    } catch (error) {
        return false;
    }
}

// Check if port is being used
async function checkPort(): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`lsof -Pi :${ANVIL_PORT} -sTCP:LISTEN -t`);
        return !!stdout.trim();
    } catch (error) {
        return false;
    }
}

// Interface for RPC request
interface RPCRequest {
    jsonrpc: string;
    method: string;
    params: any[];
    id: number;
}

// Interface for RPC response
interface RPCResponse {
    jsonrpc: string;
    result?: any;
    error?: any;
    id: number;
}

// Test RPC connection
function testRPCConnection(): Promise<boolean> {
    return new Promise((resolve) => {
        const postData: RPCRequest = {
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
        };

        const postDataString = JSON.stringify(postData);

        const options: http.RequestOptions = {
            hostname: 'localhost',
            port: ANVIL_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postDataString)
            },
            timeout: 3000
        };

        const req = http.request(options, (res: http.IncomingMessage) => {
            let data = '';
            
            res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
            });
            
            res.on('end', () => {
                try {
                    const response: RPCResponse = JSON.parse(data);
                    if (response.result) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (e) {
                    resolve(false);
                }
            });
        });

        req.on('error', () => {
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.write(postDataString);
        req.end();
    });
}

// Check anvil status
async function checkAnvilStatus(): Promise<boolean> {
    const processRunning: boolean = await checkAnvilProcess();
    if (!processRunning) {
        console.log(chalk.gray(`✗ No anvil process found`));
        return false;
    }

    const portOpen: boolean = await checkPort();
    if (!portOpen) {
        console.log(chalk.gray(`✗ Port ${ANVIL_PORT} is not being used`));
        return false;
    }

    const rpcWorking: boolean = await testRPCConnection();
    if (!rpcWorking) {
        console.log(chalk.gray(`✗ Unable to connect to anvil RPC service`));
        return false;
    }

    return true;
}

// Main function
async function main(): Promise<void> {
    console.log(`Checking port: ${ANVIL_PORT}`);

    const isRunning: boolean = await checkAnvilStatus();
    
    if (isRunning) {
        console.log(chalk.green('✓ Anvil is running'));
        updateEnvVariable('USE_ANVIL', 'true');
    } else {
        console.log(chalk.green('✓ Anvil is not running'));
        updateEnvVariable('USE_ANVIL', 'false');
    }

    console.log('');
    // console.log(chalk.yellow('Tips: You can use this script in the following ways:'));
    // console.log('  pnpm exec tsx chackAnvil.ts        # Use default port 8545');
    // console.log('  pnpm exec tsx chackAnvil.ts 8546   # Use custom port');
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