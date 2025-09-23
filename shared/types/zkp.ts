import { Multiplier2Verifier, CidUploadVerifier, WillCreationVerifier } from "./typechain-types/index.js";

import { BigNumberish } from "ethers";

interface Groth16Proof {
  proof: object;
  publicSignals: string[];
}

type VerifierContract = Multiplier2Verifier | CidUploadVerifier | WillCreationVerifier;

export type { Groth16Proof, VerifierContract };
