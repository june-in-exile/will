import {
  Multiplier2Verifier,
  CidUploadVerifier,
  WillCreationVerifier,
} from "./typechain-types/index.js";

type VerifierContract =
  | Multiplier2Verifier
  | CidUploadVerifier
  | WillCreationVerifier;

interface Groth16Proof {
  proof: object;
  publicSignals: string[];
}

interface CidUploadProofData {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: bigint[] & { length: 285 };
}

interface WillCreationProofData {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: bigint[] & { length: 292 };
}

type ProofData = CidUploadProofData | WillCreationProofData;

export type { VerifierContract, Groth16Proof, CidUploadProofData, WillCreationProofData, ProofData };
