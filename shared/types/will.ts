import { WILL_TYPE } from "@shared/constants/will.js";
import type {
  EthereumAddress,
  Estate,
  Permit2Signature,
} from "./blockchain.js";
import type { SupportedAlgorithm, Base64String } from "@shared/types/index.js";

type Will =
  | FormattedWill
  | AddressedWill
  | SignedWill
  | EncryptedWill
  | DownloadedWill
  | DecryptedWill;

interface FormattedWill {
  testator: EthereumAddress;
  estates: Estate[];
}

interface AddressedWill extends FormattedWill {
  salt: number;
  will: EthereumAddress;
}

interface SignedWill extends AddressedWill {
  permit2: Permit2Signature;
}

interface EncryptedWill {
  algorithm: SupportedAlgorithm;
  iv: Base64String;
  authTag: Base64String;
  ciphertext: Base64String;
  timestamp: number;
}

interface DownloadedWill extends EncryptedWill {}

interface DecryptedWill extends SignedWill {}

type WillType = (typeof WILL_TYPE)[keyof typeof WILL_TYPE];

type WillTypeToWillMap = {
  [WILL_TYPE.FORMATTED]: FormattedWill;
  [WILL_TYPE.ADDRESSED]: AddressedWill;
  [WILL_TYPE.SIGNED]: SignedWill;
  [WILL_TYPE.ENCRYPTED]: EncryptedWill;
  [WILL_TYPE.DOWNLOADED]: DownloadedWill;
  [WILL_TYPE.DECRYPTED]: DecryptedWill;
};

type WillFields<
  T extends WillType,
  K extends readonly (keyof WillTypeToWillMap[T])[],
> = {
  [P in K[number]]: WillTypeToWillMap[T][P];
};

export type {
  Will,
  FormattedWill,
  AddressedWill,
  SignedWill,
  EncryptedWill,
  DownloadedWill,
  DecryptedWill,
  WillType,
  WillTypeToWillMap,
  WillFields,
};
