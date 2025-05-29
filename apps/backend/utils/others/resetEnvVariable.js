import { updateEnvVariable } from './updateEnvVariable.js';

function resetEnvVariable(key) { 
    updateEnvVariable(key, '');
};

function main() {
    // resetFoundryEnvVariable('TESTAMENT_FACTORY_ADDRESS');
        
    resetEnvVariable('SALT');
    resetEnvVariable('TESTAMENT_ADDRESS');

    resetEnvVariable('BENEFICIARY0');
    resetEnvVariable('TOKEN0');
    resetEnvVariable('AMOUNT0');
    resetEnvVariable('BENEFICIARY1');
    resetEnvVariable('TOKEN1');
    resetEnvVariable('AMOUNT1');
    
    resetEnvVariable('NONCE');
    resetEnvVariable('DEADLINE');
    resetEnvVariable('TESTATOR_SIGNATURE');
    
    resetEnvVariable('CID');
    resetEnvVariable('CID_HASH');
    resetEnvVariable('EXECUTOR_SIGNATURE');
};

main();