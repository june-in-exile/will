import { updateEnvVariable } from './updateEnvVariable.js';
import chalk from 'chalk';

function resetEnvVariable(key: string): void { 
    updateEnvVariable(key, '');
}

function resetEnvVariables(keys: string[]): void { 
    keys.forEach(resetEnvVariable);
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        const defaultKeys = [
            'SALT', 'TESTAMENT_ADDRESS',
            'BENEFICIARY0', 'TOKEN0', 'AMOUNT0',
            'BENEFICIARY1', 'TOKEN1', 'AMOUNT1',
            'NONCE', 'DEADLINE', 'PERMIT2_SIGNATURE',
            'CID', 'EXECUTOR_SIGNATURE'
        ];
        console.log('Resetting default environment variables...');
        resetEnvVariables(defaultKeys);
    } else {
        resetEnvVariables(args);
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