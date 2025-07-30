import { PATHS_CONFIG } from "@config";
import { WillFileType, type WillData, type FormattedWillData, type AddressedWillData, type SignedWillData, type EncryptedWillData, type DownloadedWillData } from "@shared/types/will.js";
import type { EthereumAddress } from "@shared/types/blockchain.js";
import { writeFileSync } from "fs";
import chalk from "chalk";

interface SaveWillOptions {
  willType: WillFileType;
  data: WillData;
  salt?: number;
  willAddress?: EthereumAddress;
  signature?: {
    nonce: number;
    deadline: number;
    signature: string;
  };
}

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

function saveWill(options: SaveWillOptions): WillData {
  try {
    const { willType, data } = options;
    const filePath = getWillFilePath(willType);
    const typeLabel = getWillTypeLabel(willType);

    console.log(chalk.blue(`Preparing ${typeLabel}...`));

    let processedData: WillData;

    // Handle different will types
    switch (willType) {
      case WillFileType.ADDRESSED: {
        if (!options.salt || !options.willAddress) {
          throw new Error("Salt and will address are required for addressed will");
        }
        const addressedWill: AddressedWillData = {
          ...(data as FormattedWillData),
          salt: options.salt,
          will: options.willAddress,
        };
        processedData = addressedWill;
        break;
      }

      case WillFileType.SIGNED: {
        if (!options.signature) {
          throw new Error("Signature is required for signed will");
        }
        const signedWill: SignedWillData = {
          ...(data as AddressedWillData),
          signature: options.signature,
        };
        processedData = signedWill;
        break;
      }

      default:
        processedData = data;
        break;
    }

    // Save to file
    if (typeof processedData === 'string') {
      // For decrypted will (plain text)
      writeFileSync(filePath, processedData);
    } else {
      // For JSON data
      writeFileSync(filePath, JSON.stringify(processedData, null, 4));
    }

    console.log(
      chalk.green(` ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} saved to:`),
      filePath,
    );

    return processedData;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save ${getWillTypeLabel(options.willType)}: ${errorMessage}`);
  }
}

// Convenience functions for specific will types
function saveAddressedWill(
  willData: FormattedWillData,
  salt: number,
  predictedAddress: EthereumAddress,
): AddressedWillData {
  return saveWill({
    willType: WillFileType.ADDRESSED,
    data: willData,
    salt,
    willAddress: predictedAddress,
  }) as AddressedWillData;
}

function saveSignedWill(
  willData: AddressedWillData,
  nonce: number,
  deadline: number,
  signature: string,
): SignedWillData {
  return saveWill({
    willType: WillFileType.SIGNED,
    data: willData,
    signature: {
      nonce,
      deadline,
      signature,
    },
  }) as SignedWillData;
}

function saveEncryptedWill(encryptedWill: EncryptedWillData): void {
  saveWill({
    willType: WillFileType.ENCRYPTED,
    data: encryptedWill,
  });
}

function saveDownloadedWill(downloadedWill: DownloadedWillData): void {
  saveWill({
    willType: WillFileType.DOWNLOADED,
    data: downloadedWill,
  });
}

function saveDecryptedWill(decryptedWill: string): void {
  saveWill({
    willType: WillFileType.DECRYPTED, // Use decrypted for decrypted plain text
    data: decryptedWill,
  });
}

export {
  saveWill,
  saveAddressedWill,
  saveSignedWill,
  saveEncryptedWill,
  saveDownloadedWill,
  saveDecryptedWill,
};