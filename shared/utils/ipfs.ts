import { IPFS_CONFIG } from "@config";
import { CID } from "multiformats/cid";
import { createHelia, Helia } from "helia";
import { json, JSON } from "@helia/json";
import { promisify } from "util";
import { exec } from "child_process";
import chalk from "chalk";

const execPromise = promisify(exec);

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

async function uploadToIpfs(
    jsonHandler: JSON,
    willData: unknown,
): Promise<CID> {
    try {
        console.log(chalk.blue("Uploading data to IPFS..."));

        const cid = await jsonHandler.add(willData);
        console.log(chalk.green("✅ Data uploaded successfully"));

        return cid;
    } catch (error) {
        throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Download data from IPFS
 */
async function downloadFromIpfs(
    jsonHandler: JSON,
    cid: string
): Promise<unknown> {
    try {
        console.log(chalk.blue("Downloading data IPFS..."));

        const downloadedWill: unknown = await jsonHandler.get(CID.parse(cid));
        console.log(chalk.green("✅ Data downloaded successfully"));

        return downloadedWill;
    } catch (error) {
        throw new Error(`Failed to download from IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

async function pinInLocalDaemon(
    cid: CID,
    retryAttempts: number = IPFS_CONFIG.pinning.retryAttempts,
): Promise<boolean> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
            console.log(
                chalk.blue(
                    `Attempting to pin in local IPFS daemon (attempt ${attempt}/${retryAttempts})...`,
                ),
            );

            const { stdout, stderr } = await execPromise(
                `ipfs pin add ${cid.toString()}`,
                { timeout: IPFS_CONFIG.pinning.timeout },
            );

            if (stderr && stderr.trim()) {
                console.warn(chalk.yellow("IPFS daemon warning:"), stderr.trim());
            }

            console.log(
                chalk.green("✅ Content pinned in local IPFS daemon:"),
                stdout.trim(),
            );
            return true;
        } catch (error: unknown) {
            const isLastAttempt = attempt === retryAttempts;

            // Type-safe error handling
            if (error && typeof error === "object" && "code" in error) {
                const execError = error as { code: string; message?: string };

                if (execError.code === "TIMEOUT") {
                    console.warn(
                        chalk.yellow(
                            `⚠️ Timeout on attempt ${attempt}: IPFS daemon pinning timed out`,
                        ),
                    );
                } else if (execError.code === "ENOENT") {
                    console.error(
                        chalk.red(
                            "❌ IPFS CLI not found - please ensure IPFS is installed and in PATH",
                        ),
                    );
                    throw new Error("IPFS CLI not available - pinning failed");
                } else {
                    const errorMessage = execError.message || "Unknown exec error";
                    console.warn(
                        chalk.yellow(`⚠️ Attempt ${attempt} failed:`),
                        errorMessage,
                    );
                }
            } else {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                console.warn(
                    chalk.yellow(`⚠️ Attempt ${attempt} failed:`),
                    errorMessage,
                );
            }

            if (isLastAttempt) {
                console.error(
                    chalk.red("❌ Could not pin in local IPFS daemon after all attempts"),
                );
                console.error(chalk.gray("This might be because:"));
                console.error(chalk.gray("- The daemon is not running"));
                console.error(chalk.gray("- The CID format is incompatible"));
                console.error(chalk.gray("- Network connectivity issues"));

                // Throw error on final failure
                throw new Error(
                    `Failed to pin content in local IPFS daemon after ${retryAttempts} attempts`,
                );
            }
        }
    }

    return false;
}

async function stopHelia(helia: Helia): Promise<void> { 
    try {
        console.log(chalk.blue("Cleaning up Helia instance..."));
        await helia.stop();
        console.log(chalk.gray("✅ Helia instance stopped successfully"));
    } catch (error) {
        console.warn(
            chalk.yellow("⚠️ Warning while stopping Helia:"),
            error instanceof Error ? error.message : "Unknown stop error",
        );
    }
}

function displayAccessInfo(cid: CID): void {
    console.log(chalk.cyan("\n📍 Access Information:"));
    console.log(chalk.gray("CID:"), chalk.white(cid.toString()));

    console.log(chalk.cyan("\n🌐 IPFS Gateways:"));
    IPFS_CONFIG.gateways.forEach((gateway, index) => {
        const url = `${gateway}${cid}`;
        console.log(chalk.gray(`${index + 1}.`), chalk.blue(url));
    });
}

export { createHeliaInstance, uploadToIpfs, downloadFromIpfs, pinInLocalDaemon, stopHelia, displayAccessInfo };