import { Wallet, JsonRpcProvider, ethers, Contract } from "ethers";
import { APPROVAL_CONFIG } from "@config";
import chalk from "chalk";

async function getTokenInfo(
  tokenAddress: string,
  signer: Wallet,
): Promise<{ name: string, symbol: string }> {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      APPROVAL_CONFIG.tokenAbi,
      signer,
    );

    const [name, symbol] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
    ]);

    return { name, symbol };
  } catch (error) {
    console.warn(
      chalk.yellow(
        `⚠️ Could not fetch token info for ${tokenAddress}:`,
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
    return { name: "Unknown", symbol: "UNKNOWN" };
  }
}

async function createSigner(
  privateKey: string,
  provider: JsonRpcProvider,
): Promise<Wallet> {
  try {
    console.log(chalk.blue("Initializing signer..."));
    const signer = new ethers.Wallet(privateKey, provider);

    const address = await signer.getAddress();
    const balance = await signer.provider!.getBalance(address);

    console.log(chalk.green("✅ Signer initialized:"), chalk.white(address));
    console.log(chalk.gray("Balance:"), ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.warn(
        chalk.yellow("⚠️ Warning: Signer has zero balance for gas fees"),
      );
    }

    return signer;
  } catch (error) {

    throw new Error(`Failed to create signer: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

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

    throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function createContractInstance<T extends Contract>(
  contractAddress: string,
  contractFactory: any,
  providerOrWallet: JsonRpcProvider | Wallet,
): Promise<T> {
  try {
    console.log(chalk.blue(`Loading contract at ${contractAddress}...`));

    const contract = contractFactory.connect(
      contractAddress,
      providerOrWallet,
    ) as T;

    // Validate contract exists at address
    const provider =
      providerOrWallet instanceof Wallet
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

    return contract;
  } catch (error) {

    throw new Error(`Failed to create contract instance: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export { getTokenInfo, createSigner, createWallet, createContractInstance };
