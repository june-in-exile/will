const fs = require('fs');
const http = require('http');
const { exec } = require('child_process');
const path = require('path');



// Configuration
const ENV_FILE = path.join(__dirname, '../..', '.env');
const ANVIL_PORT = process.argv[2] || 8545;
const RPC_URL = `http://localhost:${ANVIL_PORT}`;

// Color output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

// Helper function: colored output
function colorLog(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if .env file exists
function checkEnvFile() {
    if (!fs.existsSync(ENV_FILE)) {
        colorLog(`Error: ${ENV_FILE} file does not exist`, 'red');
        process.exit(1);
    }
}

// Check anvil process
function checkAnvilProcess() {
    return new Promise((resolve) => {
        exec('pgrep -f anvil', (error, stdout) => {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Check if port is being used
function checkPort() {
    return new Promise((resolve) => {
        exec(`lsof -Pi :${ANVIL_PORT} -sTCP:LISTEN -t`, (error, stdout) => {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Test RPC connection
function testRPCConnection() {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
        });

        const options = {
            hostname: 'localhost',
            port: ANVIL_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
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

        req.write(postData);
        req.end();
    });
}

// Check anvil status
async function checkAnvilStatus() {
    const processRunning = await checkAnvilProcess();
    
    if (!processRunning) {
        return false;
    }

    const portOpen = await checkPort();
    if (!portOpen) {
        colorLog(`✗ Port ${ANVIL_PORT} is not being used`, 'red');
        return false;
    }

    const rpcWorking = await testRPCConnection();
    if (!rpcWorking) {
        colorLog('✗ Unable to connect to anvil RPC service', 'red');
        return false;
    }

    return true;
}

// Update .env file
function updateEnvFile(value) {
    try {
        let envContent = fs.readFileSync(ENV_FILE, 'utf8');
        const lines = envContent.split('\n');
        
        let found = false;
        const updatedLines = lines.map(line => {
            if (line.startsWith('USE_ANVIL=')) {
                found = true;
                return `USE_ANVIL=${value}`;
            }
            return line;
        });

        if (!found) {
            updatedLines.push(`USE_ANVIL=${value}`);
            colorLog('Adding new USE_ANVIL variable', 'yellow');
        }

        fs.writeFileSync(ENV_FILE, updatedLines.join('\n'));
        colorLog(`✓ Set USE_ANVIL to: ${value}`, 'green');
        
    } catch (error) {
        colorLog(`Error updating .env file: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Main function
async function main() {
    console.log('=== Anvil Environment Synchronizer ===');
    console.log(`Checking port: ${ANVIL_PORT}`);

    checkEnvFile();

    const isRunning = await checkAnvilStatus();
    
    if (isRunning) {
        colorLog('✓ Anvil is running', 'green');
        updateEnvFile('true');
    } else {
        colorLog('✓ Anvil is not running', 'green');
        updateEnvFile('false');
    }

    console.log('');
    // colorLog('Tips: You can use this script in the following ways:', 'yellow');
    // console.log('  node anvil-env-sync.js        # Use default port 8545');
    // console.log('  node anvil-env-sync.js 8546   # Use custom port');
}

// Execute main function
main().catch(error => {
    colorLog(`Error during script execution: ${error.message}`, 'red');
    process.exit(1);
});