import { updateBackendEnvVariable, updateFoundryEnvVariable } from './updateEnvVariable.js';

function resetBackendEnvVariable(key) { 
    updateBackendEnvVariable(key, '');
};

function resetFoundryEnvVariable(key) { 
    updateFoundryEnvVariable(key, '');
};

function main() {
        // resetFoundryEnvVariable('TESTAMENT_FACTORY_ADDRESS');
        
        resetFoundryEnvVariable('BENEFICIARY0');
        resetFoundryEnvVariable('TOKEN0');
        resetFoundryEnvVariable('AMOUNT0');
        resetFoundryEnvVariable('BENEFICIARY1');
        resetFoundryEnvVariable('TOKEN1');
        resetFoundryEnvVariable('AMOUNT1');
        resetFoundryEnvVariable('SALT');
        resetFoundryEnvVariable('TESTAMENT_ADDRESS');
        
        resetFoundryEnvVariable('NONCE');
        resetFoundryEnvVariable('DEADLINE');
        resetFoundryEnvVariable('TESTATOR_SIGNATURE');
        
        resetFoundryEnvVariable('CID');
        resetFoundryEnvVariable('CID_HASH');
        resetFoundryEnvVariable('EXECUTOR_SIGNATURE');
};

main();