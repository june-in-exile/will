import { createHelia, Helia } from "helia";
import { json, JSON } from "@helia/json";
import chalk from "chalk";

interface HeliaInstance {
    helia: Helia;
    jsonHandler: JSON;
}

async function createHeliaInstance(): Promise<HeliaInstance> {
    try {
        console.log(chalk.blue("Initializing Helia IPFS node..."));
        const helia = await createHelia();
        const jsonHandler = json(helia);

        console.log(chalk.green("✅ Helia instance created successfully"));
        return { helia, jsonHandler };
    } catch (error) {
        throw new Error(`Failed to create Helia instance: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export { createHeliaInstance };