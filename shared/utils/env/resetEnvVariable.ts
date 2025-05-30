import { updateEnvVariable } from './updateEnvVariable.js';

function resetEnvVariable(key: string): void { 
    updateEnvVariable(key, '');
}

function resetEnvVariables(keys: string[]): void { 
    keys.forEach(resetEnvVariable);
}

function main(): void {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        const defaultKeys = [
            'SALT', 'TESTAMENT_ADDRESS',
            'BENEFICIARY0', 'TOKEN0', 'AMOUNT0',
            'BENEFICIARY1', 'TOKEN1', 'AMOUNT1',
            'NONCE', 'DEADLINE', 'PERMIT2_SIGNATURE',
            'CID', 'CID_HASH', 'EXECUTOR_SIGNATURE'
        ];
        console.log('Resetting default environment variables...');
        resetEnvVariables(defaultKeys);
    } else {
        console.log(`Resetting specific environment variables: ${args.join(', ')}`);
        resetEnvVariables(args);
    }
    console.log('Reset completed');
}

main();