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

type Will =
  | FormattedWill
  | AddressedWill
  | SignedWill
  | EncryptedWill
  | DownloadedWill
  | DecryptedWill
  | string;

interface FormattedWill {
  testator: EthereumAddress;
  estates: Estate[];
}

interface AddressedWill extends FormattedWill {
  salt: number;
  will: EthereumAddress;
}

interface SignedWill extends AddressedWill {
  signature: Permit2Signature;
}

interface EncryptedWill {
  algorithm: SupportedAlgorithm;
  iv: Base64String;
  authTag: Base64String;
  ciphertext: Base64String;
  timestamp: number;
}

interface DownloadedWill extends EncryptedWill { }

interface DecryptedWill extends SignedWill { }

export {
  WillFileType,
  type Will,
  type FormattedWill,
  type AddressedWill,
  type SignedWill,
  type EncryptedWill,
  type DownloadedWill,
  type DecryptedWill,
};
