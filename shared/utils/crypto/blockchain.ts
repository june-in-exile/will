import { Wallet, JsonRpcProvider, ethers, Contract } from "ethers";
import chalk from "chalk";

function createWallet(privateKey: string, provider?: JsonRpcProvider): Wallet {
    try {
        console.log(chalk.blue("Creating wallet instance..."));
        const formattedKey = privateKey.startsWith("0x")
            ? privateKey
            : `0x${privateKey}`;
        const wallet = new Wallet(formattedKey, provider);
        console.log(chalk.green("✅ Wallet created:"), wallet.address);
        return wallet;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create wallet: ${errorMessage}`);
    }
}

async function createContractInstance<T extends Contract>(
    contractAddress: string,
    contractFactory: any,
    providerOrWallet: JsonRpcProvider | Wallet
): Promise<T> {
    try {
        console.log(chalk.blue(`Loading contract at ${contractAddress}...`));

        const contract = contractFactory.connect(contractAddress, providerOrWallet) as T;

        // Validate contract exists at address
        const provider = providerOrWallet instanceof Wallet 
            ? providerOrWallet.provider 
            : providerOrWallet;
            
        if (!provider) {
            throw new Error("Provider is null");
        }
        
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
            throw new Error(`No contract found at address: ${contractAddress}`);
        }

        console.log(chalk.green("✅ Contract loaded successfully"));
        console.log(chalk.gray("Contract address:"), contractAddress);

        return contract;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create contract instance: ${errorMessage}`);
    }
}

export { createWallet, createContractInstance };