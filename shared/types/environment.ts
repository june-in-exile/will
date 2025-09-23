interface TokenApproval {
  TESTATOR_PRIVATE_KEY: string;
  PERMIT2: string;
}

interface PredictWill {
  WILL_FACTORY: string;
}

interface PermitSigning {
  TESTATOR_PRIVATE_KEY: string;
  PERMIT2: string;
}

interface UploadCid {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
}

interface SubmitProof {
  MULTIPLIER2_VERIFIER?: string;
  CID_UPLOAD_VERIFIER?: string;
  WILL_CREATION_VERIFIER?: string;
}

interface IpfsDownload {
  CID: string;
}

interface CidSigning {
  CID: string;
  EXECUTOR_PRIVATE_KEY: string;
  EXECUTOR: string;
}

interface NotarizeCid {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
  EXECUTOR_SIGNATURE: string;
}

interface CreateWill {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
}

interface SignatureTransfer {
  EXECUTOR_PRIVATE_KEY: string;
}

export type {
  TokenApproval,
  PredictWill,
  PermitSigning,
  UploadCid,
  SubmitProof,
  IpfsDownload,
  CidSigning,
  NotarizeCid,
  CreateWill,
  SignatureTransfer,
};
