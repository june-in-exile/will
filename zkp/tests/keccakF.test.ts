import { WitnessTester } from "./util/index.js";
import { Keccak256 } from "./logic/index.js";

describe("Theta Circuit", function () {
  let circuit: WitnessTester<["state"], ["newState"]>;
  let circuitOptimized: WitnessTester<["state"], ["newState"]>;

  describe("Theta Algorithm in KeccakF", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF.circom",
        "Theta",
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccakF.circom",
        "ThetaOptimized",
      );
      circuit.setConstraint("theta");
      circuitOptimized.setConstraint("thetaOptimized");
    });

    it("should calculate correctly", async function (): Promise<void> {
      // NIST Examples with Intermediate Values
      const state = [
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0xa3a3a3a3a3a3a3a3"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
        BigInt("0x0000000000000000"),
      ];
      const stateBigUint64 = BigUint64Array.from(state);
      Keccak256.theta(stateBigUint64);

      const newState = Array.from(stateBigUint64);
      await circuit.expectPass({ state }, { newState });
      await circuitOptimized.expectPass({ state }, { newState });
    });
  });
});