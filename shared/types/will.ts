import type {
  EthereumAddress,
  Estate,
  Permit2Signature,
} from "./blockchain.js";
import type { SupportedAlgorithm } from "@shared/types/crypto.js";
import type { Base64String } from "@shared/types/base64String.js";

enum WillFileType {
  FORMATTED = "formatted",
  ADDRESSED = "addressed",
  SIGNED = "signed",
  ENCRYPTED = "encrypted",
  DOWNLOADED = "downloaded",
  DECRYPTED = "decrypted",
}

type WillData =
  | FormattedWillData
  | AddressedWillData
  | SignedWillData
  | EncryptedWillData
  | DownloadedWillData
  | string;

interface FormattedWillData {
  testator: EthereumAddress;
  estates: Estate[];
}

interface AddressedWillData extends FormattedWillData {
  salt: number;
  will: EthereumAddress;
}

interface SignedWillData extends AddressedWillData {
  signature: Permit2Signature;
}

interface EncryptedWillData {
  algorithm: SupportedAlgorithm;
  iv: Base64String;
  authTag: Base64String;
  ciphertext: Base64String;
  timestamp: number;
}

interface DownloadedWillData extends EncryptedWillData {}

export {
  WillFileType,
  type WillData,
  type FormattedWillData,
  type AddressedWillData,
  type SignedWillData,
  type EncryptedWillData,
  type DownloadedWillData,
};
