declare global {
  type ConstraintSimplification = 0 | 1 | 2;

  type CurveName =
    | "bn128"
    | "bls12377"
    | "bls12381"
    | "goldilocks"
    | "grumpkin"
    | "pallas"
    | "secq256r1"
    | "vesta";
}

export { };
