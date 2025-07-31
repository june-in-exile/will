import { PATHS_CONFIG } from "@config";
import {
  WillFileType,
  type FormattedWillData,
  type AddressedWillData,
  type SignedWillData,
  type EncryptedWillData,
  type DownloadedWillData,
  type DecryptedWillData,
} from "@shared/types/will.js";
import {
  validateFormattedWill,
  validateAddressedWill,
  validateSignedWill,
  validateEncryptedWill,
  validateDownloadedWill,
  validateDecryptedWill,
} from "@shared/utils/validation/will.js";
import { readFileSync, existsSync } from "fs";
import chalk from "chalk";

const FILE_PATHS: Record<WillFileType, string> = {
  [WillFileType.FORMATTED]: PATHS_CONFIG.will.formatted,
  [WillFileType.ADDRESSED]: PATHS_CONFIG.will.addressed,
  [WillFileType.SIGNED]: PATHS_CONFIG.will.signed,
  [WillFileType.ENCRYPTED]: PATHS_CONFIG.will.encrypted,
  [WillFileType.DOWNLOADED]: PATHS_CONFIG.will.downloaded,
  [WillFileType.DECRYPTED]: PATHS_CONFIG.will.decrypted,
};

const VALIDATORS: Record<WillFileType, (data: any) => void> = {
  [WillFileType.FORMATTED]: validateFormattedWill,
  [WillFileType.ADDRESSED]: validateAddressedWill,
  [WillFileType.SIGNED]: validateSignedWill,
  [WillFileType.ENCRYPTED]: validateEncryptedWill,
  [WillFileType.DOWNLOADED]: validateDownloadedWill,
  [WillFileType.DECRYPTED]: validateDecryptedWill,
};

/**
 * Generic will data reading function
 * @param type The type of will file to read
 * @param filePath Optional custom file path (uses default if not provided)
 * @returns Parsed and validated will data
 */
export function readWill<T>(type: WillFileType): T {
  const targetPath = FILE_PATHS[type];

  if (!existsSync(targetPath)) {
    throw new Error(`Will file does not exist: ${targetPath}`);
  }

  try {
    const typeString: string = type;

    console.log(chalk.blue(`Reading ${typeString} will data...`));

    const fileContent = readFileSync(targetPath, "utf8");
    const willData = JSON.parse(fileContent);

    VALIDATORS[type](willData);

    const typeCapitalized = typeString[0].toUpperCase() + typeString.slice(1);

    console.log(chalk.green(`✅ ${typeCapitalized} will data validated successfully`));

    return willData as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${type} will file: ${error.message}`);
    }
    throw new Error(`Failed to read ${type} will: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}