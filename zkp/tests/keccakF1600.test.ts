import { WitnessTester } from "./util/index.js";
import { Keccak256Utils, Keccak256 } from "./logic/index.js";

// NIST Examples with Intermediate Values: Round #0
const bytes = new Uint8Array(200);
bytes.fill(0xa3, 0, 136);

const stateArrayOriginal = Keccak256Utils.bytesToStateArray(bytes);
const lanesOriginal = Keccak256Utils.stateArrayToLanes(stateArrayOriginal);
const lanesAfterTheta = Keccak256.theta(lanesOriginal);
const lanesAfterRho = Keccak256.rho(lanesAfterTheta);
const lanesAfterPi = Keccak256.pi(lanesAfterRho);
const lanesAfterChi = Keccak256.chi(lanesAfterPi);
const lanesAfterIota = Keccak256.iota(lanesAfterChi, 0);

const lanesAfterKeccakF = Keccak256.keccakF(Keccak256Utils.stateArrayToLanes(stateArrayOriginal));
console.log(Keccak256Utils.lanesToHex(lanesAfterKeccakF));

describe("Theta Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Theta Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF1600.circom",
        "Theta",
      );
      circuit.setConstraint("theta");
    });

    it("should calculate correctly", async function (): Promise<void> {
      await circuit.expectPass(
        { stateArray: stateArrayOriginal },
        { newStateArray: Keccak256Utils.lanesToStateArray(lanesAfterTheta) },
      );
    });
  });
});

describe("Rho Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Rho Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF1600.circom",
        "Rho",
      );
      circuit.setConstraint("rho");
    });

    it("should calculate correctly", async function (): Promise<void> {
      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanesAfterTheta) },
        { newStateArray: Keccak256Utils.lanesToStateArray(lanesAfterRho) },
      );
    });
  });
});

describe("Pi Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Pi Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF1600.circom",
        "Pi",
      );
      circuit.setConstraint("pi");
    });

    it("should calculate correctly", async function (): Promise<void> {
      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanesAfterRho) },
        { newStateArray: Keccak256Utils.lanesToStateArray(lanesAfterPi) },
      );
    });
  });
});

describe("Chi Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Chi Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF1600.circom",
        "Chi",
      );
      circuit.setConstraint("chi");
    });

    it("should calculate correctly", async function (): Promise<void> {
      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanesAfterPi) },
        { newStateArray: Keccak256Utils.lanesToStateArray(lanesAfterChi) },
      );
    });
  });
});

describe("Iota Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Iota Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF1600.circom",
        "Iota",
        {
          templateParams: ["0"],
        }
      );
      circuit.setConstraint("iota");
    });

    it("should calculate correctly", async function (): Promise<void> {
      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanesAfterChi) },
        { newStateArray: Keccak256Utils.lanesToStateArray(lanesAfterIota) },
      );
    });
  });
});

describe("KeccakF1600 Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Keccak-F[1600] Permutation Function", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF1600.circom",
        "KeccakF1600",
      );
      circuit.setConstraint("keccak-f[1600]");
    });
    
    it("should calculate ι(χ(π(ρ(θ(A)))) for 24 rounds", async function (): Promise<void> {
      await circuit.expectPass(
        { stateArray: stateArrayOriginal },
        { newStateArray: Keccak256Utils.lanesToStateArray(lanesAfterKeccakF) },
      );
    });
  });
});