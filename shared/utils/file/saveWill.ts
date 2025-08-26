import { WILL_FILE_PATH } from "@shared/constants/will.js";
import type { Will, WillType } from "@shared/types/will.js";
import { writeFileSync } from "fs";
import chalk from "chalk";

function saveWill(willType: WillType, data: Will): void {
  // const typeLabel = getWillTypeLabel(willType);
  try {
    const filePath = WILL_FILE_PATH[willType];

    console.log(chalk.blue(`Saving ${willType} will...`));

    // Save to file
    if (typeof data === "string") {
      // For decrypted will (plain text)
      writeFileSync(filePath, data);
    } else {
      // For JSON data
      const replacer = (_key: string, value: any) => {
        return typeof value === 'bigint' ? value.toString() : value;
      };
      writeFileSync(filePath, JSON.stringify(data, replacer, 4));
    }

    console.log(
      chalk.green(
        `✅ ${willType.charAt(0).toUpperCase() + willType.slice(1)} will saved to:`,
      ),
      filePath,
    );
  } catch (error) {
    throw new Error(
      `Failed to save ${willType} will: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { saveWill };
