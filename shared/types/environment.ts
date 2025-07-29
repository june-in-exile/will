export interface TokenApproval {
  TESTATOR_PRIVATE_KEY: string;
  PERMIT2: string;
}

export interface PredictWill {
  WILL_FACTORY: string;
}

export interface TransferSigning {
  TESTATOR_PRIVATE_KEY: string;
  PERMIT2: string;
}

export interface UploadCID {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
}


export interface SubmitProof {
  UPLOAD_CID_VERIFIER: string;
}

export interface IPFSDownload {
  CID: string;
}

export interface CIDSigning {
  CID: string;
  EXECUTOR_PRIVATE_KEY: string;
  EXECUTOR: string;
}

export interface NotarizeCID {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
  EXECUTOR_SIGNATURE: string;
}

export interface CreateWill {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
  TESTATOR: string;
  SALT: string;
}

export interface SignatureTransfer {
  WILL: string;
  EXECUTOR_PRIVATE_KEY: string;
  NONCE: string;
  DEADLINE: string;
  PERMIT2_SIGNATURE: string;
}
