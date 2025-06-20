import { readProof } from "@shared/utils/read";
import { ethers } from "ethers";
import chalk from "chalk";

async function submitProof(
    contractAddress: string,
    provider: ethers.Provider,
    signer: ethers.Signer
  ) {
    const proof = readProof();
    
    const contractABI = [
      "function verifyProof(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[] memory _pubSignals) public view returns (bool)"
    ];
  
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
  
    try {
        const tx = await contract.verifyProof(
            proof.pA,
            proof.pB,
            proof.pC,
            proof.pubSignals
        );
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        return receipt;
    } catch (error) {
        console.error("Error submitting proof:", error);
        throw error;
    }
}

/**
 * Main function
 */
async function main(): Promise<void> {
    try {
        console.log(chalk.cyan('\n=== Testament CID Upload ===\n'));

        const provider = new ethers.JsonRpcProvider("http://localhost:8545");
        const { EXECUTOR_PRIVATE_KEY, PERMIT2_VERIFIER_ADDRESS } = process.env;
        if (EXECUTOR_PRIVATE_KEY === undefined) {
            throw new Error('EXECUTOR_PRIVATE_KEY is not defined');
        }
        const signer = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);

        if (PERMIT2_VERIFIER_ADDRESS === undefined) {
            throw new Error('PERMIT2_VERIFIER_ADDRESS is not defined');
        }
        try {
            await submitProof(PERMIT2_VERIFIER_ADDRESS, provider, signer);
        } catch (error) {
            console.error("Main error:", error);
        }
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