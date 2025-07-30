import { PATHS_CONFIG } from "@config";
import {
  WillFileType,
  type FormattedWillData,
  type AddressedWillData,
  type SignedWillData,
  type EncryptedWillData,
  type DownloadedWillData,
} from "@shared/types/will.js";
import {
  validateFormattedWill,
  validateAddressedWill,
  validateSignedWill,
  validateEncryptedWill,
  validateDownloadedWill,
} from "@shared/utils/validation/will.js";
import { readFileSync, existsSync } from "fs";
import chalk from "chalk";

const FILE_PATHS: Record<WillFileType, string> = {
  [WillFileType.FORMATTED]: PATHS_CONFIG.will.formatted,
  [WillFileType.ADDRESSED]: PATHS_CONFIG.will.addressed,
  [WillFileType.SIGNED]: PATHS_CONFIG.will.signed,
  [WillFileType.ENCRYPTED]: PATHS_CONFIG.will.encrypted,
  [WillFileType.DOWNLOADED]: PATHS_CONFIG.will.downloaded,
};

const VALIDATORS: Record<WillFileType, (data: any) => void> = {
  [WillFileType.FORMATTED]: validateFormattedWill,
  [WillFileType.ADDRESSED]: validateAddressedWill,
  [WillFileType.SIGNED]: validateSignedWill,
  [WillFileType.ENCRYPTED]: validateEncryptedWill,
  [WillFileType.DOWNLOADED]: validateDownloadedWill,
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
    console.log(chalk.blue(`Reading ${type} will data...`));

    const fileContent = readFileSync(targetPath, "utf8");
    const willData = JSON.parse(fileContent);

    VALIDATORS[type](willData);

    console.log(chalk.green(`✅ ${type} will data validated successfully`));

    return willData as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${type} will file: ${error.message}`);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read ${type} will: ${errorMessage}`);
  }
}

// // Convenience functions for specific will types
// export function readFormattedWill(): FormattedWillData {
//   return readWill<FormattedWillData>(WillFileType.FORMATTED);
// }

// export function readAddressedWill(): AddressedWillData {
//   return readWill<AddressedWillData>(WillFileType.ADDRESSED);
// }

// export function readSignedWill(): SignedWillData {
//   return readWill<SignedWillData>(WillFileType.SIGNED);
// }

// export function readEncryptedWill(): EncryptedWillData {
//   return readWill<EncryptedWillData>(WillFileType.ENCRYPTED);
// }

// export function readDownloadedWill(): DownloadedWillData {
//   return readWill<DownloadedWillData>(WillFileType.DOWNLOADED);
// }

// // Legacy compatibility functions (for backward compatibility)
// export function readWillData(type: WillFileType = WillFileType.FORMATTED): any {
//   switch (type) {
//     case WillFileType.FORMATTED:
//       return readFormattedWill();
//     case WillFileType.ADDRESSED:
//       return readAddressedWill();
//     case WillFileType.SIGNED:
//       return readSignedWill();
//     case WillFileType.ENCRYPTED:
//       return readEncryptedWill();
//     case WillFileType.DOWNLOADED:
//       return readDownloadedWill();
//     default:
//       throw new Error(`Unsupported will file type: ${type}`);
//   }
// }
