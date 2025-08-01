import { JsonRpcProvider, Network } from "ethers";
import { ANVIL_CHAIN_ID } from "@shared/constants/blockchain.js";
import chalk from "chalk";

async function validateNetwork(provider: JsonRpcProvider): Promise<Network> {
  try {
    console.log(chalk.blue("Validating network connection..."));
    const network = await provider.getNetwork();
    if (network.chainId == ANVIL_CHAIN_ID) {
      network.name = "anvil";
    }
    console.log(
      chalk.green("✅ Connected to network:"),
      network.name,
      `(Chain ID: ${network.chainId})`,
    );
    return network;
  } catch (error) {
    throw new Error(
      `Failed to connect to RPC endpoint: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { validateNetwork };
