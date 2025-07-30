import { JsonRpcProvider, Network } from "ethers";
import chalk from "chalk";

async function validateNetwork(provider: JsonRpcProvider): Promise<Network> {
  try {
    console.log(chalk.blue("Validating network connection..."));
    const network = await provider.getNetwork();
    console.log(
      chalk.green("✅ Connected to network:"),
      network.name,
      `(Chain ID: ${network.chainId})`,
    );
    return network;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to connect to RPC endpoint: ${errorMessage}`);
  }
}

export { validateNetwork };
