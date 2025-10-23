import {
  PATHS_CONFIG,
  SALT_CONFIG,
  PERMIT2_CONFIG,
  SERIALIZATION_CONFIG,
  SIGNATURE_CONFIG,
} from "@config";
import type { WillType } from "@shared/types/will.js";

const WILL_TYPE = {
  FORMATTED: "formatted",
  ADDRESSED: "addressed",
  SIGNED: "signed",
  SERIALIZED: "serialized",
  ENCRYPTED: "encrypted",
  DOWNLOADED: "downloaded",
  DECRYPTED: "decrypted",
  DESERIALIZED: "deserialized",
} as const;

const WILL_FILE_PATH: Record<WillType, string> = {
  [WILL_TYPE.FORMATTED]: PATHS_CONFIG.will.formatted,
  [WILL_TYPE.ADDRESSED]: PATHS_CONFIG.will.addressed,
  [WILL_TYPE.SIGNED]: PATHS_CONFIG.will.signed,
  [WILL_TYPE.SERIALIZED]: PATHS_CONFIG.will.serialized,
  [WILL_TYPE.ENCRYPTED]: PATHS_CONFIG.will.encrypted,
  [WILL_TYPE.DOWNLOADED]: PATHS_CONFIG.will.downloaded,
  [WILL_TYPE.DECRYPTED]: PATHS_CONFIG.will.decrypted,
  [WILL_TYPE.DESERIALIZED]: PATHS_CONFIG.will.deserialized,
};

const FIELD_HEX_LENGTH = {
  TESTATOR: 40,
  EXECUTOR: 40,
  BENEFICIARY: 40,
  TOKEN: 40,
  AMOUNT: SERIALIZATION_CONFIG.maxAmountBytes * 2,
  SALT: SALT_CONFIG.defaultSaltBytes * 2,
  WILL: 40,
  NONCE: PERMIT2_CONFIG.maxNonceBytes * 2,
  DEADLINE: 16,
  SIGNATURE: SIGNATURE_CONFIG.signatureLength,
};

export { WILL_TYPE, WILL_FILE_PATH, FIELD_HEX_LENGTH };
