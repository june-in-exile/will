// Import and run all tests
import('./aes-gcm.js').then(({ AESVerification }) => {
    console.log('=== Running AES-GCM Tests ===');
    AESVerification.runAllTests();
});

import('./keccak256.js').then(({ Keccak256Verification }) => {
    console.log('\n=== Running Keccak256 Tests ===');
    Keccak256Verification.runAllTests();
});