import { updateEnvVariable } from './updateEnvVariable';

function resetEnvVariable(key: string): void { 
    updateEnvVariable(key, '');
};

function main(): void {
    const variablesToReset = [
        'SALT', 'TESTAMENT_ADDRESS',
        'BENEFICIARY0', 'TOKEN0', 'AMOUNT0',
        'BENEFICIARY1', 'TOKEN1', 'AMOUNT1',
        'NONCE', 'DEADLINE', 'PERMIT2_SIGNATURE',
        'CID', 'CID_HASH', 'EXECUTOR_SIGNATURE'
    ];
        
    variablesToReset.forEach(resetEnvVariable);
};

main();