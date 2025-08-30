import { WitnessTester } from "./util/index.js";
import { Keccak256Utils, Keccak256 } from "./logic/index.js";

// NIST Examples with Intermediate Values
const bytes = new Uint8Array(200);
bytes.fill(0xa3, 0, 136);

const stateArrayOriginal = Keccak256Utils.bytesToStateArray(bytes);
const lanesOriginal = Keccak256Utils.stateArrayToLanes(stateArrayOriginal);
const lanesAfterTheta = Keccak256.theta(lanesOriginal);
const lanesAfterRho = Keccak256.rho(lanesAfterTheta);
// const lanesAfterPi = Keccak256.rho(lanesAfterRho);
// const lanesAfterChi = Keccak256.rho(lanesAfterPi);
// const lanesAfterIota = Keccak256.rho(lanesAfterChi);

describe("Theta Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["newStateArray"]>;

  describe("Theta Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF.circom",
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
        "circuits/shared/components/keccak256/keccakF.circom",
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
