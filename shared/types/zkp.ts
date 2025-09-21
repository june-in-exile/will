interface Groth16Proof {
    proof: object;
    publicSignals: string[];
}

interface Multiplier2Input {
    a: number;
    b: number;
}

interface UploadCidInput {
    ciphertext: number[];
    key: number[];
    iv: number[];
}

interface CreateWillInput {
    ciphertext: number[];
    key: number[];
    iv: number[];
    expectedTestator: bigint;
    expectedEstates: bigint[];
}

export type { Groth16Proof, Multiplier2Input, UploadCidInput, CreateWillInput };