import { BaseWorkflow } from "./base.js";
import { JsonRpcProvider, Network, Wallet, formatUnits } from "ethers";
import chalk from "chalk";

export abstract class BlockchainWorkflow<TInput, TResult> extends BaseWorkflow<TInput, TResult> {
    protected provider!: JsonRpcProvider;
    protected network!: Network;

    // 區塊鏈專用驗證方法
    protected async validateRpcConnection(provider: JsonRpcProvider): Promise<Network> {
        try {
            console.log(chalk.blue("Validating RPC connection..."));
            const network = await provider.getNetwork();
            console.log(
                chalk.green("✅ Connected to network:"),
                network.name,
                `(Chain ID: ${network.chainId})`
            );
            return network;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to connect to RPC endpoint: ${errorMessage}`);
        }
    }

    protected createWallet(privateKey: string, provider: JsonRpcProvider): Wallet {
        try {
            console.log(chalk.blue("Creating wallet instance..."));
            const wallet = new Wallet(privateKey, provider);
            console.log(chalk.green("✅ Wallet created:"), wallet.address);
            return wallet;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to create wallet: ${errorMessage}`);
        }
    }

    protected async validateNetwork(provider: JsonRpcProvider): Promise<Network> {
        try {
            console.log(chalk.blue("Validating network connection..."));
            const network = await provider.getNetwork();
            const gasPrice = await provider.getFeeData();

            console.log(chalk.green("✅ Connected to network:"), network.name);
            console.log(chalk.gray("Chain ID:"), network.chainId.toString());
            console.log(
                chalk.gray("Gas price:"),
                formatUnits(gasPrice.gasPrice || 0n, "gwei"),
                "gwei"
            );

            return network;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to validate network: ${errorMessage}`);
        }
    }

    // 統一的交易結果更新
    protected async updateTransactionResult(
        prefix: string,
        result: { transactionHash: string; timestamp: number }
    ): Promise<void> {
        const updates = {
            [`${prefix}_TX_HASH`]: result.transactionHash,
            [`${prefix}_TIMESTAMP`]: result.timestamp.toString(),
        };
        await this.updateEnvironmentVariables(updates);
    }
}

// 需要連接 RPC、創建錢包、執行交易的檔案
// apps/backend/src/onchain/permit2/approveTokenPermit2.ts          // ✅ BlockchainWorkflow
// apps/backend/src/onchain/willFactory/uploadCID.ts               // ✅ BlockchainWorkflow  
// apps/backend/src/onchain/willFactory/createWill.ts              // ✅ BlockchainWorkflow
// apps/backend/src/onchain/willFactory/predictWill.ts             // ✅ BlockchainWorkflow
// apps/backend/src/onchain/willFactory/notarizeCid.ts             // ✅ BlockchainWorkflow
// apps/backend/src/onchain/will/signatureTransfer.ts              // ✅ BlockchainWorkflow
// apps/backend/src/onchain/groth16Verifier/submitProof.ts         // ✅ BlockchainWorkflow