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

export interface UploadCid {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
}

export interface SubmitProof {
  UPLOAD_CID_VERIFIER: string;
}

export interface IpfsDownload {
  CID: string;
}

export interface CidSigning {
  CID: string;
  EXECUTOR_PRIVATE_KEY: string;
  EXECUTOR: string;
}

export interface NotarizeCid {
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
