import { CRYPTO_CONFIG } from "@config";

type HashableInput = string | number | boolean | object;
interface HashArgs {
  input: HashableInput;
  encoding?: string;
}

interface EncryptionArgs {
  algorithm: SupportedAlgorithm;
  plaintext: Buffer;
  key: Buffer;
  iv: Buffer;
}

interface DecryptionArgs {
  algorithm: SupportedAlgorithm;
  ciphertext: Buffer;
  key: Buffer;
  iv: Buffer;
  authTag: Buffer;
}
interface ProofData {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint];
}

type SupportedAlgorithm = (typeof CRYPTO_CONFIG.supportedAlgorithms)[number];

export type {
  HashArgs,
  EncryptionArgs,
  DecryptionArgs,
  ProofData,
  HashableInput,
  SupportedAlgorithm,
};
