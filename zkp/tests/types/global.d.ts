declare global {
  interface Groth16Proof {
    proof: any;
    publicSignals: string[];
  }
}

export {};