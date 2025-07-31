import { CRYPTO_CONFIG } from "@config";

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
type HashableInput = string | number | boolean | object;
type ByteInput = Uint8Array | ArrayBuffer | Buffer | number[];

export type { EncryptionArgs, DecryptionArgs, ProofData, HashableInput, ByteInput, SupportedAlgorithm };
