import { SALT_CONFIG } from "@config";
import chalk from "chalk";

function generateSalt(timestamp: number = Date.now()): number {
    try {
        console.log(chalk.blue(`Generating salt...`));

        const randomArray = new Uint32Array(1);
        crypto.getRandomValues(randomArray);

        const randomPart = randomArray[0] % SALT_CONFIG.timestampMultiplier;
        const salt =
            (timestamp * SALT_CONFIG.timestampMultiplier + randomPart) %
            SALT_CONFIG.maxSafeInteger;

        console.log(chalk.gray("Generated salt:"), salt);
        return salt;
    } catch (error) {
        throw new Error(`Failed to generate salt: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export { generateSalt };