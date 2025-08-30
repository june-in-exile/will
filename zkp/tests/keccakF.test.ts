import { WitnessTester } from "./util/index.js";
import { Keccak256Utils, Keccak256 } from "./logic/index.js";

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
      // NIST Examples with Intermediate Values
      const bytes = new Uint8Array(200);
      bytes.fill(0xA3, 0, 136);
      const stateArray = Keccak256Utils.bytesToStateArray(bytes);

      const lanes = Keccak256Utils.stateArrayToLanes(stateArray);
      const lanesAfterTheta = Keccak256.theta(lanes);
      const newStateArray = Keccak256Utils.lanesToStateArray(lanesAfterTheta);
      
      await circuit.expectPass({ stateArray }, { newStateArray });
    });
  });
});
