import { PATHS_CONFIG } from "@config";
import { WillFileType, type Will } from "@shared/types/will.js";
import { writeFileSync } from "fs";
import chalk from "chalk";

function getWillFilePath(willType: WillFileType): string {
  switch (willType) {
    case WillFileType.FORMATTED:
      return PATHS_CONFIG.will.formatted;
    case WillFileType.ADDRESSED:
      return PATHS_CONFIG.will.addressed;
    case WillFileType.SIGNED:
      return PATHS_CONFIG.will.signed;
    case WillFileType.ENCRYPTED:
      return PATHS_CONFIG.will.encrypted;
    case WillFileType.DOWNLOADED:
      return PATHS_CONFIG.will.downloaded;
    case WillFileType.DECRYPTED:
      return PATHS_CONFIG.will.decrypted;
    default:
      throw new Error(`Unsupported will type: ${willType}`);
  }
}

function getWillTypeLabel(willType: WillFileType): string {
  switch (willType) {
    case WillFileType.FORMATTED:
      return "formatted will";
    case WillFileType.ADDRESSED:
      return "addressed will";
    case WillFileType.SIGNED:
      return "signed will";
    case WillFileType.ENCRYPTED:
      return "encrypted will";
    case WillFileType.DOWNLOADED:
      return "downloaded will";
    case WillFileType.DECRYPTED:
      return "decrypted will";
    default:
      return "will";
  }
}

function saveWill(willType: WillFileType, data: Will): void {
  const typeLabel = getWillTypeLabel(willType);
  try {
    const filePath = getWillFilePath(willType);

    console.log(chalk.blue(`Saving ${typeLabel}...`));

    // Save to file
    if (typeof data === "string") {
      // For decrypted will (plain text)
      writeFileSync(filePath, data);
    } else {
      // For JSON data
      writeFileSync(filePath, JSON.stringify(data, null, 4));
    }

    console.log(
      chalk.green(
        `✅ ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} saved to:`,
      ),
      filePath,
    );
  } catch (error) {
    throw new Error(
      `Failed to save ${typeLabel}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { saveWill };
